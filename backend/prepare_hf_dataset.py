import os
from datasets import load_dataset

def convert_to_yolo(bbox, img_width, img_height):
    # Hugging Face usually provides COCO format: [x_min, y_min, width, height]
    x_min, y_min, w, h = bbox
    
    # YOLO format expects: [x_center, y_center, width, height] Normalized (0.0 to 1.0)
    x_center = (x_min + w / 2) / img_width
    y_center = (y_min + h / 2) / img_height
    norm_w = w / img_width
    norm_h = h / img_height
    
    return x_center, y_center, norm_w, norm_h

def process_split(dataset_split, split_name):
    img_dir = f'datasets/sonar/{split_name}/images'
    lbl_dir = f'datasets/sonar/{split_name}/labels'
    os.makedirs(img_dir, exist_ok=True)
    os.makedirs(lbl_dir, exist_ok=True)
    
    print(f"Processing {len(dataset_split)} images for {split_name}...")
    
    for idx, item in enumerate(dataset_split):
        img = item['image']
        img_width, img_height = img.size
        
        # Save image
        img_filename = f"{split_name}_{idx}.jpg"
        img_path = os.path.join(img_dir, img_filename)
        img.save(img_path)
        
        # Save YOLO label file
        lbl_filename = f"{split_name}_{idx}.txt"
        lbl_path = os.path.join(lbl_dir, lbl_filename)
        
        objects = item.get('objects', {})
        bboxes = objects.get('bbox', [])
        
        with open(lbl_path, 'w') as f:
            for i in range(len(bboxes)):
                yolo_bbox = convert_to_yolo(bboxes[i], img_width, img_height)
                # Class 0 = Crab-Pot (assuming this dataset only has one class)
                f.write(f"0 {yolo_bbox[0]:.6f} {yolo_bbox[1]:.6f} {yolo_bbox[2]:.6f} {yolo_bbox[3]:.6f}\n")

if __name__ == '__main__':
    # ==========================================
    # PASTE YOUR HUGGING FACE TOKEN HERE:
    # Example: MY_TOKEN = "hf_xxxYourTokenHerexxx"
    # ==========================================
    MY_TOKEN = "PASTE_YOUR_TOKEN_HERE"
    
    print("Downloading Hugging Face Dataset (this might take a minute)...")
    
    if MY_TOKEN == "PASTE_YOUR_TOKEN_HERE":
        print("ERROR: You forgot to paste your Hugging Face token in the script!")
        print("Please open prepare_hf_dataset.py in VS Code, paste your token on line 42, and run this again.")
        exit()

    ds = load_dataset("PINGEcosystem/sss-crab-pot-detection-ds", token=MY_TOKEN)
    
    # Process train split
    if 'train' in ds:
        process_split(ds['train'], 'train')
    
    # Use validation if it exists, otherwise check for test, otherwise split train manually
    if 'validation' in ds:
        process_split(ds['validation'], 'valid')
    elif 'test' in ds:
        process_split(ds['test'], 'valid')
    else:
        print("No validation split found. You might want to split the train data manually.")
        
    print("Done! The dataset is converted to YOLO format and ready for training.")
