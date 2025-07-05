import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MuiCard from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { styled } from '@mui/material/styles';
import { SitemarkIcon } from './CustomIcons';

const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  boxShadow:
    'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
  [theme.breakpoints.up('sm')]: {
    width: '450px',
  },
  ...theme.applyStyles('dark', {
    boxShadow:
      'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
  }),
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001/api' 
  : 'https://your-production-api.vercel.app/api';

export default function SignInCard() {
  const [tabValue, setTabValue] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  // Sign In State
  const [signInEmail, setSignInEmail] = React.useState('');
  const [signInPassword, setSignInPassword] = React.useState('');
  const [signInEmailError, setSignInEmailError] = React.useState('');
  const [signInPasswordError, setSignInPasswordError] = React.useState('');

  // Sign Up State
  const [signUpName, setSignUpName] = React.useState('');
  const [signUpEmail, setSignUpEmail] = React.useState('');
  const [signUpPassword, setSignUpPassword] = React.useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = React.useState('');
  const [signUpNameError, setSignUpNameError] = React.useState('');
  const [signUpEmailError, setSignUpEmailError] = React.useState('');
  const [signUpPasswordError, setSignUpPasswordError] = React.useState('');
  const [signUpConfirmPasswordError, setSignUpConfirmPasswordError] = React.useState('');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateSignIn = () => {
    let isValid = true;

    if (!signInEmail) {
      setSignInEmailError('Email is required');
      isValid = false;
    } else if (!validateEmail(signInEmail)) {
      setSignInEmailError('Please enter a valid email address');
      isValid = false;
    } else {
      setSignInEmailError('');
    }

    if (!signInPassword) {
      setSignInPasswordError('Password is required');
      isValid = false;
    } else if (signInPassword.length < 6) {
      setSignInPasswordError('Password must be at least 6 characters');
      isValid = false;
    } else {
      setSignInPasswordError('');
    }

    return isValid;
  };

  const validateSignUp = () => {
    let isValid = true;

    if (!signUpName.trim()) {
      setSignUpNameError('Full name is required');
      isValid = false;
    } else {
      setSignUpNameError('');
    }

    if (!signUpEmail) {
      setSignUpEmailError('Email is required');
      isValid = false;
    } else if (!validateEmail(signUpEmail)) {
      setSignUpEmailError('Please enter a valid email address');
      isValid = false;
    } else {
      setSignUpEmailError('');
    }

    if (!signUpPassword) {
      setSignUpPasswordError('Password is required');
      isValid = false;
    } else if (signUpPassword.length < 8) {
      setSignUpPasswordError('Password must be at least 8 characters');
      isValid = false;
    } else {
      setSignUpPasswordError('');
    }

    if (!signUpConfirmPassword) {
      setSignUpConfirmPasswordError('Please confirm your password');
      isValid = false;
    } else if (signUpPassword !== signUpConfirmPassword) {
      setSignUpConfirmPasswordError('Passwords do not match');
      isValid = false;
    } else {
      setSignUpConfirmPasswordError('');
    }

    return isValid;
  };

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!validateSignIn()) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: signInEmail,
          password: signInPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store user token and info
        localStorage.setItem('jobTracker_token', data.token);
        localStorage.setItem('jobTracker_user', JSON.stringify(data.user));
        
        setSuccess('Sign in successful! Redirecting...');
        
        // Redirect to main app after 2 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        setError(data.message || 'Sign in failed. Please try again.');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!validateSignUp()) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: signUpName.trim(),
          email: signUpEmail,
          password: signUpPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store user token and info
        localStorage.setItem('jobTracker_token', data.token);
        localStorage.setItem('jobTracker_user', JSON.stringify(data.user));
        
        setSuccess('Account created successfully! Welcome to Job Tracker! Redirecting...');
        
        // Redirect to main app after 3 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      } else {
        setError(data.message || 'Sign up failed. Please try again.');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="outlined">
      <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mb: 2 }}>
        <SitemarkIcon />
      </Box>
      
      <Typography
        component="h1"
        variant="h4"
        sx={{ 
          width: '100%', 
          fontSize: 'clamp(2rem, 10vw, 2.15rem)',
          textAlign: 'center',
          mb: 2
        }}
      >
        Job Tracker
      </Typography>

      <Typography
        variant="body1"
        sx={{ 
          textAlign: 'center',
          color: 'text.secondary',
          mb: 3
        }}
      >
        Your comprehensive job application management system
      </Typography>

      <Tabs 
        value={tabValue} 
        onChange={handleTabChange} 
        variant="fullWidth"
        sx={{ mb: 2 }}
      >
        <Tab label="Sign In" />
        <Tab label="Sign Up" />
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Sign In Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box
          component="form"
          onSubmit={handleSignIn}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <FormControl>
            <FormLabel htmlFor="signin-email">Email</FormLabel>
            <TextField
              error={!!signInEmailError}
              helperText={signInEmailError}
              id="signin-email"
              type="email"
              value={signInEmail}
              onChange={(e) => setSignInEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              required
              fullWidth
              variant="outlined"
            />
          </FormControl>
          
          <FormControl>
            <FormLabel htmlFor="signin-password">Password</FormLabel>
            <TextField
              error={!!signInPasswordError}
              helperText={signInPasswordError}
              id="signin-password"
              type="password"
              value={signInPassword}
              onChange={(e) => setSignInPassword(e.target.value)}
              placeholder="••••••"
              autoComplete="current-password"
              required
              fullWidth
              variant="outlined"
            />
          </FormControl>

          <Button 
            type="submit" 
            fullWidth 
            variant="contained" 
            disabled={loading}
            sx={{ mt: 1 }}
          >
            {loading && <CircularProgress size={20} sx={{ mr: 1 }} />}
            Sign In
          </Button>
        </Box>
      </TabPanel>

      {/* Sign Up Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box
          component="form"
          onSubmit={handleSignUp}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <FormControl>
            <FormLabel htmlFor="signup-name">Full Name</FormLabel>
            <TextField
              error={!!signUpNameError}
              helperText={signUpNameError}
              id="signup-name"
              type="text"
              value={signUpName}
              onChange={(e) => setSignUpName(e.target.value)}
              placeholder="John Doe"
              autoComplete="name"
              required
              fullWidth
              variant="outlined"
            />
          </FormControl>

          <FormControl>
            <FormLabel htmlFor="signup-email">Email</FormLabel>
            <TextField
              error={!!signUpEmailError}
              helperText={signUpEmailError}
              id="signup-email"
              type="email"
              value={signUpEmail}
              onChange={(e) => setSignUpEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              required
              fullWidth
              variant="outlined"
            />
          </FormControl>
          
          <FormControl>
            <FormLabel htmlFor="signup-password">Password</FormLabel>
            <TextField
              error={!!signUpPasswordError}
              helperText={signUpPasswordError}
              id="signup-password"
              type="password"
              value={signUpPassword}
              onChange={(e) => setSignUpPassword(e.target.value)}
              placeholder="Choose a strong password"
              autoComplete="new-password"
              required
              fullWidth
              variant="outlined"
            />
          </FormControl>

          <FormControl>
            <FormLabel htmlFor="signup-confirm-password">Confirm Password</FormLabel>
            <TextField
              error={!!signUpConfirmPasswordError}
              helperText={signUpConfirmPasswordError}
              id="signup-confirm-password"
              type="password"
              value={signUpConfirmPassword}
              onChange={(e) => setSignUpConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              autoComplete="new-password"
              required
              fullWidth
              variant="outlined"
            />
          </FormControl>

          <Button 
            type="submit" 
            fullWidth 
            variant="contained" 
            disabled={loading}
            sx={{ mt: 1 }}
          >
            {loading && <CircularProgress size={20} sx={{ mr: 1 }} />}
            Create Account
          </Button>
        </Box>
      </TabPanel>

      <Divider sx={{ mt: 3, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Secure • Private • Cloud-based
        </Typography>
      </Divider>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
        Your data is encrypted and stored safely in the cloud
      </Typography>
    </Card>
  );
}