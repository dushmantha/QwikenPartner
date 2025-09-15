# cPanel Upload Instructions for Qwiken Website

## Files Created
- **qwiken-website-upload.zip** (6.6MB) - Ready for upload to cPanel

## Upload Steps

### 1. Access cPanel
1. Log in to your cPanel account
2. Navigate to **File Manager**

### 2. Upload the ZIP File
1. Navigate to your domain's root directory (usually `public_html` or `www`)
2. Click **Upload** button
3. Select `qwiken-website-upload.zip`
4. Wait for upload to complete

### 3. Extract Files
1. Right-click on `qwiken-website-upload.zip`
2. Select **Extract**
3. Extract to current directory
4. This will create a `web` folder

### 4. Move Files to Root
1. Open the `web` folder
2. Select all files (Ctrl+A or Cmd+A)
3. Move them to the root directory (`public_html`)
4. Delete the empty `web` folder
5. Delete the `qwiken-website-upload.zip` file

### 5. Verify Installation
1. Visit your domain to ensure the website loads
2. Check that all images load correctly
3. Test the contact form

## File Structure After Upload
```
public_html/
├── index.html
├── icon.svg
├── favicon-16.png
├── favicon-32.png
├── favicon-192.png
├── favicon-512.png
├── apple-touch-icon.png
├── site.webmanifest
├── CNAME
└── assets/
    ├── css/
    │   └── style.css
    ├── js/
    │   └── script.js
    └── images/
        ├── qwiken-logo.png
        ├── app-store-badge.svg
        ├── google-play-badge.svg
        └── web-images/
            └── [screenshot images]
```

## Important Notes

### Email Configuration
The contact form is configured to send emails to:
- Primary: `admin@qwiken.org`
- CC: `support@qwiken.org`

**Note**: The contact form uses a Supabase Edge Function that needs to be deployed separately for email functionality to work.

### SSL/HTTPS
Ensure your domain has SSL certificate enabled in cPanel for secure browsing.

### Domain Settings
If you haven't already:
1. Point your domain to the cPanel hosting
2. Update DNS settings if needed
3. Enable SSL certificate

## Troubleshooting

### Images Not Loading
- Check file permissions (should be 644 for files, 755 for directories)
- Verify paths in HTML are correct

### Contact Form Not Working
- The Edge Function `contact-form` needs to be deployed in Supabase
- Check browser console for any JavaScript errors

### 404 Errors
- Ensure index.html is in the root directory
- Check .htaccess file if present

## Support
For any issues, contact your hosting provider or web administrator.