import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image, File, CheckCircle, AlertTriangle } from 'lucide-react';

interface FileUploadProps {
  label: string;
  description: string;
  type: string;
  files: { type: string; file: File }[];
  onUpload: (type: string, file: File) => void;
  maxSizeMB?: number;
  accept?: string;
}

const ACCEPTED_TYPES = {
  'image/png': true,
  'image/jpeg': true,
  'image/jpg': true,
  'application/pdf': true,
};

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
  if (mimeType === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
  return <File className="w-5 h-5 text-gray-500" />;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({ label, description, type, files, onUpload, maxSizeMB = 10, accept = '.pdf,.jpg,.jpeg,.png' }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const existingFile = files.find((f) => f.type === type);

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES[file.type as keyof typeof ACCEPTED_TYPES]) {
      return 'Invalid file type. Only PNG, JPEG, and PDF files are accepted.';
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size exceeds ${maxSizeMB}MB limit.`;
    }
    return null;
  }, [maxSizeMB]);

  const handleFile = useCallback((file: File) => {
    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    onUpload(type, file);
  }, [type, onUpload, validateFile]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFile(selectedFile);
    if (inputRef.current) inputRef.current.value = '';
  }, [handleFile]);

  const removeFile = useCallback(() => {
    setPreview(null);
    setError(null);
    onUpload(type, null as unknown as File);
  }, [type, onUpload]);

  return (
    <div>
      <label className="label">{label}</label>
      <p className="text-xs text-gray-500 mb-2">{description}</p>

      {existingFile ? (
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          <div className="flex items-start gap-3">
            {preview ? (
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                {getFileIcon(existingFile.file.type)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <p className="text-sm font-medium text-gray-900 truncate">{existingFile.file.name}</p>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatFileSize(existingFile.file.size)} - {existingFile.file.type.split('/')[1].toUpperCase()}
              </p>
            </div>
            <button
              onClick={removeFile}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <button
            onClick={() => inputRef.current?.click()}
            className="mt-3 w-full py-2 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
          >
            Replace file
          </button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleChange}
          />
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
            dragActive
              ? 'border-primary-400 bg-primary-50'
              : error
              ? 'border-red-300 bg-red-50'
              : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
          }`}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleChange}
          />

          <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
            dragActive ? 'bg-primary-100' : 'bg-gray-100'
          }`}>
            <Upload className={`w-6 h-6 ${dragActive ? 'text-primary-600' : 'text-gray-400'}`} />
          </div>

          <p className={`text-sm font-medium ${dragActive ? 'text-primary-700' : 'text-gray-700'}`}>
            {dragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            PNG, JPEG, or PDF up to {maxSizeMB}MB
          </p>
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs">{error}</p>
        </div>
      )}
    </div>
  );
}
