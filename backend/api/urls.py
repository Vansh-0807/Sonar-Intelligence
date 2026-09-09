from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ScanViewSet, DetectionViewSet

router = DefaultRouter()
router.register(r'scans', ScanViewSet)
router.register(r'detections', DetectionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
