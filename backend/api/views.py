from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.conf import settings
from .models import Scan, Detection
from .serializers import ScanSerializer, DetectionSerializer
from .ml_utils import process_scan

class ScanViewSet(viewsets.ModelViewSet):
    queryset = Scan.objects.all().order_by('-uploaded_at')
    serializer_class = ScanSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        scan = serializer.instance
        
        # Process the scan
        scan_path = scan.image.path
        
        # Simulate GPS coordinates if missing (as per Definition of Done)
        import random
        if not scan.latitude:
            scan.latitude = 21.49 + random.uniform(-0.025, 0.025)
        if not scan.longitude:
            scan.longitude = 72.9 + random.uniform(-0.025, 0.025)
            
        detections_data, processed_img_rel_path = process_scan(scan_path, settings.MEDIA_ROOT)
        
        if processed_img_rel_path:
            scan.processed_image = processed_img_rel_path
            
        scan.save()
            
        # Create detection records
        for d_data in detections_data:
            Detection.objects.create(
                scan=scan,
                object_type=d_data['object_type'],
                confidence=d_data['confidence'],
                bbox_x=d_data['bbox_x'],
                bbox_y=d_data['bbox_y'],
                bbox_w=d_data['bbox_w'],
                bbox_h=d_data['bbox_h'],
                priority=d_data['priority']
            )
            
        # Return updated scan with detections
        headers = self.get_success_headers(serializer.data)
        updated_serializer = self.get_serializer(scan)
        return Response(updated_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        total_scans = Scan.objects.count()
        total_detections = Detection.objects.count()
        fishing_nets = Detection.objects.filter(object_type='Fishing Net').count()
        high_priority = Detection.objects.filter(priority='HIGH').count()
        unknown_anomalies = Detection.objects.filter(object_type='Unknown Anomaly').count()

        return Response({
            'total_scans': total_scans,
            'total_debris_found': total_detections,
            'fishing_nets': fishing_nets,
            'high_priority': high_priority,
            'unknown_anomalies': unknown_anomalies
        })

    @action(detail=False, methods=['get'])
    def missions(self, request):
        from django.db.models import Count
        missions_data = Scan.objects.values('survey_id').annotate(
            total_scans=Count('id', distinct=True),
            total_debris=Count('detections', distinct=True)
        ).order_by('-survey_id')
        return Response(missions_data)

class DetectionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Detection.objects.all()
    serializer_class = DetectionSerializer
