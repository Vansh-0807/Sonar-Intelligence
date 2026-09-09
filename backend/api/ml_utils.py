import cv2
import os
from ultralytics import YOLO

# Load the newly trained custom YOLOv8 model!
# Pointing to the file generated from your training run
import os
from django.conf import settings

model_path = os.path.join(settings.BASE_DIR, 'runs', 'detect', 'sonar_debris_model', 'weights', 'best.pt')
model = YOLO(model_path)

def process_scan(scan_path, media_root):
    # Preprocessing with OpenCV
    img = cv2.imread(scan_path)
    if img is None:
        return [], None
    
    # Simple denoising (simulate preprocessing for sonar)
    denoised = cv2.fastNlMeansDenoisingColored(img, None, 10, 10, 7, 21)
    
    # Save processed image
    filename = os.path.basename(scan_path)
    name, ext = os.path.splitext(filename)
    proc_filename = f"{name}_proc{ext}"
    
    proc_dir = os.path.join(media_root, 'scans_processed')
    os.makedirs(proc_dir, exist_ok=True)
    proc_path = os.path.join(proc_dir, proc_filename)
    cv2.imwrite(proc_path, denoised)
    
    # YOLO Detection
    results = model(proc_path)
    
    detections = []
    for r in results:
        boxes = r.boxes
        for box in boxes:
            cls_id = int(box.cls[0])
            class_name = model.names[cls_id]
            
            # Map common coco classes to simulate debris (e.g. bottle -> Plastic)
            if class_name == 'Crab-Pot': class_name = 'Crab-Pot / Fishing Gear'
            elif class_name in ['bottle', 'cup']: class_name = 'Plastic/Other Debris'
            elif class_name in ['car', 'truck', 'airplane', 'bus', 'boat']: class_name = 'Metal Debris'
            else: class_name = 'Unknown Anomaly'
            
            conf = float(box.conf[0])
            xywh = box.xywh[0].tolist()
            
            # Prioritization logic
            priority = "LOW"
            if conf > 0.8: priority = "HIGH"
            elif conf > 0.5: priority = "MEDIUM"
            
            detections.append({
                'object_type': class_name,
                'confidence': conf,
                'bbox_x': xywh[0],
                'bbox_y': xywh[1],
                'bbox_w': xywh[2],
                'bbox_h': xywh[3],
                'priority': priority
            })
            
    return detections, f"scans_processed/{proc_filename}"
