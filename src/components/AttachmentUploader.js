import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

// REPLACE THIS with your Google Script URL
const UPLOAD_URL = 'YOUR_GOOGLE_SCRIPT_URL_HERE';

const AttachmentUploader = ({ onUploadComplete, buttonText = 'Add Attachment' }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    setUploading(true);
    setUploadError(null);
    const file = acceptedFiles[0];

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData,  // Don't set Content-Type header - let browser set it with boundary
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc', '.docx'],
      'application/vnd.ms-excel': ['.xls', '.xlsx'],
      'text/plain': ['.txt'],
    },
  });

  return (
    <div className="mt-2">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-500">Uploading...</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            📎 {isDragActive ? 'Drop your file here' : buttonText}
          </p>
        )}
      </div>
      {uploadError && (
        <p className="text-xs text-red-500 mt-1">{uploadError}</p>
      )}
    </div>
  );
};

export default AttachmentUploader;
