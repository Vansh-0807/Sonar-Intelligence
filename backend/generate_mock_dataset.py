import os
from PIL import Image, ImageDraw
import random

def create_mock_dataset():
    splits = ['train', 'valid']
    
    for split in splits:
        img_dir = f"datasets/sonar/{split}/images"
        lbl_dir = f"datasets/sonar/{split}/labels"
        os.makedirs(img_dir, exist_ok=True)
        os.makedirs(lbl_dir, exist_ok=True)
        
        # Create 5 fake images per split
        for i in range(5):
            # 1. Create a dark noisy background simulating sonar
            img = Image.new('RGB', (640, 640), color=(10, 15, 20))
            draw = ImageDraw.Draw(img)
            
            # 2. Draw a fake "Crab-Pot" (a simple gray rectangle)
            x1 = random.randint(100, 500)
            y1 = random.randint(100, 500)
            w = random.randint(30, 80)
            h = random.randint(30, 80)
            
            draw.rectangle([x1, y1, x1+w, y1+h], fill=(100, 100, 100))
            
            # Save Image
            img.save(f"{img_dir}/mock_{i}.jpg")
            
            # 3. Create YOLO label (class 0, x_center, y_center, w, h)
            x_center = (x1 + w/2) / 640.0
            y_center = (y1 + h/2) / 640.0
            norm_w = w / 640.0
            norm_h = h / 640.0
            
            with open(f"{lbl_dir}/mock_{i}.txt", "w") as f:
                f.write(f"0 {x_center:.6f} {y_center:.6f} {norm_w:.6f} {norm_h:.6f}\n")
                
    print("Mock dataset generated successfully in datasets/sonar/ !")

if __name__ == '__main__':
    create_mock_dataset()
