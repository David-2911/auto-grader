import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  LinearProgress,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CloudUpload,
  InsertDriveFile,
  Delete,
  Preview,
  CheckCircle,
  Warning,
  Info,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { Assignment, Submission } from '@/types';

const DropZone = styled(Box)(({ theme, isDragActive }: { theme: any; isDragActive: boolean }) => ({
  border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.grey[300]}`,
  borderRadius: theme.spacing(2),
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  backgroundColor: isDragActive ? theme.palette.primary.light + '20' : theme.palette.grey[50],
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: theme.palette.primary.light + '10',
    borderColor: theme.palette.primary.main,
  },
}));

const FileInput = styled('input')({
  display: 'none',
});

const FilePreview = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  margin: theme.spacing(1, 0),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  border: `1px solid ${theme.palette.divider}`,
}));

interface AssignmentSubmissionProps {
  assignment: Assignment;
  onSubmit: (data: { file?: File; submissionText?: string }) => void;
  onCancel: () => void;
  loading?: boolean;
  uploadProgress?: number;
  existingSubmission?: Submission;
  isResubmission?: boolean;
}

interface FileWithPreview extends File {
  preview?: string;
}

export const AssignmentSubmission: React.FC<AssignmentSubmissionProps> = ({
  assignment,
  onSubmit,
  onCancel,
  loading = false,
  uploadProgress = 0,
  existingSubmission,
  isResubmission = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(null);
  const [submissionText, setSubmissionText] = useState(
    existingSubmission?.submissionText || ''
  );
  const [showPreview, setShowPreview] = useState(false);
  const [confirmSubmission, setConfirmSubmission] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = assignment.allowedFileTypes || ['pdf', 'doc', 'docx', 'txt'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const validateFile = useCallback((file: File): string[] => {
    const errors: string[] = [];
    
    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`File size must be less than ${maxFileSize / (1024 * 1024)}MB`);
    }
    
    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension && !allowedTypes.includes(fileExtension)) {
      errors.push(`File type .${fileExtension} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    return errors;
  }, [allowedTypes, maxFileSize]);

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0] as FileWithPreview;
      
      const errors = validateFile(file);
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }
      
      setValidationErrors([]);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        file.preview = URL.createObjectURL(file);
      }
      
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    if (selectedFile?.preview) {
      URL.revokeObjectURL(selectedFile.preview);
    }
    setSelectedFile(null);
    setValidationErrors([]);
  };

  const handleSubmit = () => {
    if (!selectedFile && !submissionText.trim()) {
      setValidationErrors(['Please select a file or enter submission text']);
      return;
    }
    
    setConfirmSubmission(true);
  };

  const confirmAndSubmit = () => {
    onSubmit({
      file: selectedFile || undefined,
      submissionText: submissionText.trim() || undefined,
    });
    setConfirmSubmission(false);
  };

  const isDeadlinePassed = new Date() > new Date(assignment.deadline);
  const isNearDeadline = new Date() > new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours before

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ flexGrow: 1 }}>
              {isResubmission ? 'Resubmit Assignment' : 'Submit Assignment'}
            </Typography>
            {isDeadlinePassed && (
              <Chip
                icon={<Warning />}
                label="Past Deadline"
                color="error"
                variant="outlined"
              />
            )}
            {!isDeadlinePassed && isNearDeadline && (
              <Chip
                icon={<Warning />}
                label="Due Soon"
                color="warning"
                variant="outlined"
              />
            )}
          </Box>

          <Typography variant="h6" gutterBottom>
            {assignment.title}
          </Typography>

          <Typography variant="body2" color="text.secondary" paragraph>
            {assignment.description}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Chip
              label={`Due: ${new Date(assignment.deadline).toLocaleDateString()}`}
              variant="outlined"
              size="small"
            />
            <Chip
              label={`Points: ${assignment.totalPoints}`}
              variant="outlined"
              size="small"
            />
            <Chip
              label={`Max Submissions: ${assignment.maxSubmissions}`}
              variant="outlined"
              size="small"
            />
          </Box>

          {assignment.instructions && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Info sx={{ mr: 1, fontSize: 16 }} />
                Instructions
              </Typography>
              <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                {assignment.instructions}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* File Upload Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            File Upload
          </Typography>

          <DropZone 
            isDragActive={isDragActive}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={openFileDialog}
          >
            <FileInput
              ref={fileInputRef}
              type="file"
              onChange={handleFileInputChange}
              accept={allowedTypes.map(type => `.${type}`).join(',')}
            />
            <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            {isDragActive ? (
              <Typography variant="body1">Drop the file here...</Typography>
            ) : (
              <Box>
                <Typography variant="body1" gutterBottom>
                  Drag & drop a file here, or click to select
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Allowed types: {allowedTypes.join(', ')} | Max size: {maxFileSize / (1024 * 1024)}MB
                </Typography>
              </Box>
            )}
          </DropZone>

          <AnimatePresence>
            {selectedFile && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <FilePreview>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <InsertDriveFile sx={{ mr: 1, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {selectedFile.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    {selectedFile.preview && (
                      <Tooltip title="Preview">
                        <IconButton size="small" onClick={() => setShowPreview(true)}>
                          <Preview />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Remove">
                      <IconButton size="small" onClick={removeFile} color="error">
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </FilePreview>
              </motion.div>
            )}
          </AnimatePresence>

          {validationErrors.length > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Box component="ul" sx={{ margin: 0, paddingLeft: 2 }}>
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </Box>
            </Alert>
          )}
        </Paper>

        {/* Text Submission Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Text Submission (Optional)
          </Typography>
          <TextField
            multiline
            rows={6}
            fullWidth
            placeholder="Enter your submission text here..."
            value={submissionText}
            onChange={(e) => setSubmissionText(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Typography variant="caption" color="text.secondary">
            You can provide additional text along with your file submission or use this for text-only submissions.
          </Typography>
        </Paper>

        {/* Progress Section */}
        {loading && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              Uploading... {uploadProgress}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Paper>
        )}

        {/* Existing Submission Info */}
        {existingSubmission && (
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'warning.light' }}>
            <Typography variant="h6" gutterBottom>
              Previous Submission
            </Typography>
            <Typography variant="body2" gutterBottom>
              Submitted: {new Date(existingSubmission.submittedAt).toLocaleString()}
            </Typography>
            {existingSubmission.originalFileName && (
              <Typography variant="body2" gutterBottom>
                File: {existingSubmission.originalFileName}
              </Typography>
            )}
            {existingSubmission.grade !== null && (
              <Typography variant="body2">
                Grade: {existingSubmission.grade}/{assignment.totalPoints}
              </Typography>
            )}
          </Paper>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || (!selectedFile && !submissionText.trim())}
            startIcon={loading ? undefined : <CheckCircle />}
          >
            {loading ? 'Submitting...' : isResubmission ? 'Resubmit' : 'Submit Assignment'}
          </Button>
        </Box>
      </motion.div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmSubmission} onClose={() => setConfirmSubmission(false)}>
        <DialogTitle>Confirm Submission</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to submit this assignment?
          </Typography>
          {selectedFile && (
            <Typography variant="body2" gutterBottom>
              File: {selectedFile.name}
            </Typography>
          )}
          {submissionText.trim() && (
            <Typography variant="body2" gutterBottom>
              Text submission: {submissionText.length} characters
            </Typography>
          )}
          {isResubmission && (
            <Alert severity="info" sx={{ mt: 2 }}>
              This will replace your previous submission.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmSubmission(false)}>Cancel</Button>
          <Button onClick={confirmAndSubmit} variant="contained" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>File Preview</DialogTitle>
        <DialogContent>
          {selectedFile?.preview && (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={selectedFile.preview}
                alt="Preview"
                style={{ maxWidth: '100%', maxHeight: '500px' }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssignmentSubmission;
