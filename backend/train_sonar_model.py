# HOW TO TRAIN YOUR SONAR YOLOv8 MODEL

import os
from ultralytics import YOLO

def main():
    checkpoint_path = 'runs/detect/sonar_debris_model/weights/last.pt'
    
    # 1. Check if a previous training checkpoint exists
    if os.path.exists(checkpoint_path):
        print(f"Checkpoint found at {checkpoint_path}. Resuming training...")
        model = YOLO(checkpoint_path)
        
        # Resume training from the last saved epoch
        results = model.train(
            resume=True
        )
    else:
        print("No checkpoint found. Starting fresh training from yolov8n.pt...")
        # Load the base pre-trained model
        model = YOLO('yolov8n.pt') 

        # Train the model on your custom dataset
        results = model.train(
            data='sonar_data.yaml', 
            epochs=50, 
            imgsz=640,
            batch=16,
            name='sonar_debris_model'
        )

    # 3. After training, the best model weights will be saved in:
    print("Training complete! Your new model is saved at: runs/detect/sonar_debris_model/weights/best.pt")

if __name__ == '__main__':
    main()
