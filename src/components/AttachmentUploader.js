import React, { useCallback, useState } from 'react';

// Replace this URL with your Google Apps Script URL after deployment
const UPLOAD_URL = 'YOUR_GOOGLE_SCRIPT_URL_HERE';

const AttachmentUploader = ({ onUploadComplete, buttonText = 'Add Attachment' }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const onDrop = useCallback(async (event) => {
    // Simple file selection without react-dropzone
    const file = event.target.files[0];
    if (!file) return;
    
    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        onUploadComplete(result.url, result.fileName);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete]);

  return (
    <div className="mt-2">
      <div className="border-2 border-dashed rounded-lg p-3 text-center border-gray-300">
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-500">Uploading...</p>
          </div>
        ) : (
          <label className="cursor-pointer block">
            <span className="text-sm text-gray-500">📎 {buttonText}</span>
            <input
              type="file"
              className="hidden"
              onChange={onDrop}
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
          </label>
        )}
      </div>
      {uploadError && (
        <p className="text-xs text-red-500 mt-1">{uploadError}</p>
      )}
    </div>
  );
};

export default AttachmentUploader;
