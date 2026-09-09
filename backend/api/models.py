from django.db import models

class Scan(models.Model):
    image = models.ImageField(upload_to='scans/')
    processed_image = models.ImageField(upload_to='scans_processed/', null=True, blank=True)
    survey_id = models.CharField(max_length=100, default="SSS-2026-001")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

class Detection(models.Model):
    scan = models.ForeignKey(Scan, related_name='detections', on_delete=models.CASCADE)
    object_type = models.CharField(max_length=50)
    confidence = models.FloatField()
    bbox_x = models.FloatField()
    bbox_y = models.FloatField()
    bbox_w = models.FloatField()
    bbox_h = models.FloatField()
    priority = models.CharField(max_length=20, default="LOW")
