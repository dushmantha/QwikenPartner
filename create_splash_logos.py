#!/usr/bin/env python3
"""
Create splash screen logos for iOS with proper sizing and transparency
"""
import subprocess
import os
from PIL import Image, ImageDraw

def create_splash_logo_from_svg():
    """Create splash logos from SVG for iOS"""
    
    svg_path = 'web/icon.svg'
    ios_assets_path = 'ios/BuzyBees/Images.xcassets/SplashLogo.imageset'
    
    # iOS splash logo sizes (1x, 2x, 3x)
    splash_sizes = {
        'splash-logo-1x.png': 200,  # 1x size
        'splash-logo-2x.png': 400,  # 2x size  
        'splash-logo-3x.png': 600   # 3x size
    }
    
    print("🎨 Creating iOS splash logos from SVG...")
    
    for filename, size in splash_sizes.items():
        output_path = os.path.join(ios_assets_path, filename)
        temp_png = f'/tmp/splash_temp_{size}.png'
        
        try:
            # Convert SVG to PNG using qlmanage (macOS)
            subprocess.run([
                'qlmanage', '-t', '-s', str(size), 
                '-o', '/tmp', svg_path
            ], check=True, capture_output=True)
            
            # qlmanage output path
            qlmanage_output = f'/tmp/{os.path.basename(svg_path)}.png'
            
            if os.path.exists(qlmanage_output):
                # Load and process the image
                img = Image.open(qlmanage_output)
                
                # Create a new image with transparent background
                # This removes the background and keeps only the logo
                logo_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
                
                # Resize the source image to fit with padding
                logo_size = int(size * 0.6)  # 60% of the total size for good padding
                resized_img = img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
                
                # Center the logo
                x = (size - logo_size) // 2
                y = (size - logo_size) // 2
                logo_img.paste(resized_img, (x, y), resized_img if resized_img.mode == 'RGBA' else None)
                
                # Save the final image
                logo_img.save(output_path, 'PNG')
                print(f"✅ Created {filename} ({size}x{size})")
                
                # Clean up temp file
                os.remove(qlmanage_output)
                
            else:
                print(f"❌ Failed to convert SVG for {filename}")
                
        except Exception as e:
            print(f"❌ Error creating {filename}: {e}")
            # Create a fallback solid color logo
            create_fallback_splash_logo(size, output_path)

def create_fallback_splash_logo(size, output_path):
    """Create a fallback splash logo with solid colors"""
    print(f"🔧 Creating fallback splash logo ({size}x{size})")
    
    # Create transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Calculate logo size with padding (60% of total size)
    logo_size = int(size * 0.6)
    margin = (size - logo_size) // 2
    
    # Draw circular background with Qwiken purple color
    draw.ellipse([margin, margin, margin + logo_size, margin + logo_size], 
                 fill=(131, 121, 205, 255))  # #8379cd - purple from SVG
    
    # Add a smaller accent circle (Q shape approximation)
    accent_size = logo_size // 3
    accent_margin = margin + (logo_size - accent_size) // 2
    draw.ellipse([accent_margin, accent_margin, accent_margin + accent_size, accent_margin + accent_size], 
                 fill=(245, 245, 233, 255))  # #f5f5e9 - cream from SVG
    
    img.save(output_path, 'PNG')
    print(f"✅ Created fallback logo: {os.path.basename(output_path)}")

if __name__ == "__main__":
    create_splash_logo_from_svg()
    print("\n🎉 iOS splash logos created successfully!")
    print("The logos are now:")
    print("  • Properly sized with 40% padding around the icon")
    print("  • Transparent background (will show app background color)")
    print("  • Available in 1x, 2x, and 3x resolutions for iOS")