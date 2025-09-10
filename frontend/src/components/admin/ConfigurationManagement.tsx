import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Cloud as CloudIcon,
  Email as EmailIcon,
  Psychology as PsychologyIcon,
  Visibility as VisibilityIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { adminService } from '../../services/admin.service';

interface ConfigSection {
  title: string;
  icon: React.ReactNode;
  configs: ConfigItem[];
}

interface ConfigItem {
  key: string;
  label: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json' | 'password';
  description: string;
  required: boolean;
  sensitive?: boolean;
}

const ConfigurationManagement: React.FC = () => {
  const [editingConfig, setEditingConfig] = useState<ConfigItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const queryClient = useQueryClient();

  // Fetch all configurations
  const {
    data: configsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-configs'],
    queryFn: () => adminService.getAllConfigs(),
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) =>
      adminService.updateConfig(key, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-configs'] });
      setSnackbar({ open: true, message: 'Configuration updated successfully', severity: 'success' });
      setEditDialogOpen(false);
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to update configuration', severity: 'error' });
    },
  });

  const handleEditConfig = (config: ConfigItem) => {
    setEditingConfig(config);
    setEditValue(config.type === 'json' ? JSON.stringify(config.value, null, 2) : String(config.value));
    setEditDialogOpen(true);
  };

  const handleSaveConfig = () => {
    if (!editingConfig) return;

    let parsedValue = editValue;
    
    if (editingConfig.type === 'number') {
      parsedValue = Number(editValue);
    } else if (editingConfig.type === 'boolean') {
      parsedValue = editValue === 'true';
    } else if (editingConfig.type === 'json') {
      try {
        parsedValue = JSON.parse(editValue);
      } catch (e) {
        setSnackbar({ open: true, message: 'Invalid JSON format', severity: 'error' });
        return;
      }
    }

    updateConfigMutation.mutate({ key: editingConfig.key, value: parsedValue });
  };

  const handleBooleanToggle = (config: ConfigItem) => {
    updateConfigMutation.mutate({ key: config.key, value: !config.value });
  };

  const configSections: ConfigSection[] = [
    {
      title: 'System Settings',
      icon: <SecurityIcon />,
      configs: [
        {
          key: 'system.maintenance_mode',
          label: 'Maintenance Mode',
          value: configsData?.data?.system?.maintenance_mode || false,
          type: 'boolean',
          description: 'Enable maintenance mode to prevent user access during system updates',
          required: true,
        },
        {
          key: 'system.max_file_size',
          label: 'Max File Size (MB)',
          value: configsData?.data?.system?.max_file_size || 10,
          type: 'number',
          description: 'Maximum file size allowed for uploads',
          required: true,
        },
        {
          key: 'system.session_timeout',
          label: 'Session Timeout (minutes)',
          value: configsData?.data?.system?.session_timeout || 60,
          type: 'number',
          description: 'User session timeout in minutes',
          required: true,
        },
        {
          key: 'system.api_rate_limit',
          label: 'API Rate Limit (requests/minute)',
          value: configsData?.data?.system?.api_rate_limit || 100,
          type: 'number',
          description: 'Maximum API requests per minute per user',
          required: true,
        },
      ],
    },
    {
      title: 'Email Configuration',
      icon: <EmailIcon />,
      configs: [
        {
          key: 'email.smtp_host',
          label: 'SMTP Host',
          value: configsData?.data?.email?.smtp_host || '',
          type: 'string',
          description: 'SMTP server hostname',
          required: true,
        },
        {
          key: 'email.smtp_port',
          label: 'SMTP Port',
          value: configsData?.data?.email?.smtp_port || 587,
          type: 'number',
          description: 'SMTP server port',
          required: true,
        },
        {
          key: 'email.smtp_username',
          label: 'SMTP Username',
          value: configsData?.data?.email?.smtp_username || '',
          type: 'string',
          description: 'SMTP authentication username',
          required: true,
        },
        {
          key: 'email.smtp_password',
          label: 'SMTP Password',
          value: configsData?.data?.email?.smtp_password || '',
          type: 'password',
          description: 'SMTP authentication password',
          required: true,
          sensitive: true,
        },
        {
          key: 'email.from_address',
          label: 'From Address',
          value: configsData?.data?.email?.from_address || '',
          type: 'string',
          description: 'Default sender email address',
          required: true,
        },
      ],
    },
    {
      title: 'Storage Configuration',
      icon: <StorageIcon />,
      configs: [
        {
          key: 'storage.provider',
          label: 'Storage Provider',
          value: configsData?.data?.storage?.provider || 'local',
          type: 'string',
          description: 'Storage provider (local, aws, azure, gcp)',
          required: true,
        },
        {
          key: 'storage.aws_bucket',
          label: 'AWS S3 Bucket',
          value: configsData?.data?.storage?.aws_bucket || '',
          type: 'string',
          description: 'AWS S3 bucket name',
          required: false,
        },
        {
          key: 'storage.aws_region',
          label: 'AWS Region',
          value: configsData?.data?.storage?.aws_region || '',
          type: 'string',
          description: 'AWS region for S3 bucket',
          required: false,
        },
        {
          key: 'storage.backup_enabled',
          label: 'Backup Enabled',
          value: configsData?.data?.storage?.backup_enabled || false,
          type: 'boolean',
          description: 'Enable automatic backups',
          required: true,
        },
      ],
    },
    {
      title: 'ML Model Configuration',
      icon: <PsychologyIcon />,
      configs: [
        {
          key: 'ml.default_model',
          label: 'Default Model',
          value: configsData?.data?.ml?.default_model || 'bert-base',
          type: 'string',
          description: 'Default ML model for grading',
          required: true,
        },
        {
          key: 'ml.confidence_threshold',
          label: 'Confidence Threshold',
          value: configsData?.data?.ml?.confidence_threshold || 0.8,
          type: 'number',
          description: 'Minimum confidence score for automated grading',
          required: true,
        },
        {
          key: 'ml.training_enabled',
          label: 'Training Enabled',
          value: configsData?.data?.ml?.training_enabled || true,
          type: 'boolean',
          description: 'Enable model training and improvement',
          required: true,
        },
        {
          key: 'ml.gpu_enabled',
          label: 'GPU Acceleration',
          value: configsData?.data?.ml?.gpu_enabled || false,
          type: 'boolean',
          description: 'Use GPU for ML model inference',
          required: true,
        },
      ],
    },
    {
      title: 'OCR Configuration',
      icon: <VisibilityIcon />,
      configs: [
        {
          key: 'ocr.provider',
          label: 'OCR Provider',
          value: configsData?.data?.ocr?.provider || 'tesseract',
          type: 'string',
          description: 'OCR service provider',
          required: true,
        },
        {
          key: 'ocr.language',
          label: 'OCR Language',
          value: configsData?.data?.ocr?.language || 'eng',
          type: 'string',
          description: 'Default OCR language',
          required: true,
        },
        {
          key: 'ocr.dpi',
          label: 'OCR DPI',
          value: configsData?.data?.ocr?.dpi || 300,
          type: 'number',
          description: 'DPI for OCR processing',
          required: true,
        },
      ],
    },
    {
      title: 'Academic Settings',
      icon: <SchoolIcon />,
      configs: [
        {
          key: 'academic.grade_scale',
          label: 'Grade Scale',
          value: configsData?.data?.academic?.grade_scale || { A: 90, B: 80, C: 70, D: 60, F: 0 },
          type: 'json',
          description: 'Grade scale configuration',
          required: true,
        },
        {
          key: 'academic.assignment_types',
          label: 'Assignment Types',
          value: configsData?.data?.academic?.assignment_types || ['Homework', 'Quiz', 'Exam', 'Project'],
          type: 'json',
          description: 'Available assignment types',
          required: true,
        },
        {
          key: 'academic.max_submissions',
          label: 'Max Submissions per Assignment',
          value: configsData?.data?.academic?.max_submissions || 3,
          type: 'number',
          description: 'Maximum number of submissions allowed per assignment',
          required: true,
        },
      ],
    },
  ];

  const renderConfigValue = (config: ConfigItem) => {
    if (config.type === 'boolean') {
      return (
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(config.value)}
              onChange={() => handleBooleanToggle(config)}
              disabled={updateConfigMutation.isPending}
            />
          }
          label=""
        />
      );
    }

    if (config.sensitive) {
      return (
        <Chip
          label="••••••••"
          variant="outlined"
          size="small"
        />
      );
    }

    if (config.type === 'json') {
      return (
        <Chip
          label="JSON Object"
          variant="outlined"
          size="small"
        />
      );
    }

    return (
      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
        {String(config.value)}
      </Typography>
    );
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load configurations. Please try again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Configuration Management
        </Typography>
        <IconButton onClick={() => refetch()} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Configuration Sections */}
      {configSections.map((section, index) => (
        <Accordion key={index} defaultExpanded={index === 0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {section.icon}
              <Typography variant="h6">{section.title}</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {section.configs.map((config, configIndex) => (
                <React.Fragment key={config.key}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" fontWeight="medium">
                            {config.label}
                          </Typography>
                          {config.required && (
                            <Chip label="Required" size="small" color="error" />
                          )}
                          {config.sensitive && (
                            <Chip label="Sensitive" size="small" color="warning" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                            {config.description}
                          </Typography>
                          {renderConfigValue(config)}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleEditConfig(config)}
                        disabled={updateConfigMutation.isPending}
                      >
                        <EditIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {configIndex < section.configs.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Edit Configuration Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit Configuration: {editingConfig?.label}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            {editingConfig?.description}
          </Typography>
          
          {editingConfig?.type === 'boolean' ? (
            <FormControlLabel
              control={
                <Switch
                  checked={editValue === 'true'}
                  onChange={(e) => setEditValue(e.target.checked ? 'true' : 'false')}
                />
              }
              label={editingConfig.label}
            />
          ) : (
            <TextField
              fullWidth
              multiline={editingConfig?.type === 'json'}
              rows={editingConfig?.type === 'json' ? 6 : 1}
              type={editingConfig?.type === 'password' ? 'password' : 
                    editingConfig?.type === 'number' ? 'number' : 'text'}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={`Enter ${editingConfig?.label}`}
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveConfig}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={updateConfigMutation.isPending}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ConfigurationManagement;
