import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  FormControlLabel,
  Switch
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon, Upload as UploadIcon } from '@mui/icons-material';

const CreateAssignmentPage: React.FC = () => {
  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Button
            component={Link}
            to="/assignments"
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            sx={{ mb: 2 }}
          >
            Back to Assignments
          </Button>
          
          <Typography variant="h4" component="h1" gutterBottom>
            Create New Assignment
          </Typography>
        </Box>

        <Paper sx={{ p: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Assignment Title"
                placeholder="Enter assignment title"
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Course</InputLabel>
                <Select label="Course">
                  <MenuItem value="math101">Math 101</MenuItem>
                  <MenuItem value="cs101">CS 101</MenuItem>
                  <MenuItem value="physics101">Physics 101</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Total Points"
                type="number"
                placeholder="100"
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                placeholder="Enter assignment description and instructions"
                multiline
                rows={6}
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Due Date"
                type="datetime-local"
                variant="outlined"
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Time Limit (minutes)"
                type="number"
                placeholder="120"
                variant="outlined"
                helperText="Leave empty for no time limit"
              />
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Assignment File
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    component="label"
                  >
                    Upload PDF
                    <input type="file" hidden accept=".pdf" />
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    Upload the assignment question PDF
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Settings
              </Typography>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Allow multiple submissions"
              />
              <FormControlLabel
                control={<Switch />}
                label="Enable auto-grading"
              />
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Visible to students"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              color="primary"
            >
              Create Assignment
            </Button>
            <Button
              component={Link}
              to="/assignments"
              variant="outlined"
            >
              Cancel
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default CreateAssignmentPage;