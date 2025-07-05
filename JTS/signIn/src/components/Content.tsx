import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import WorkRoundedIcon from '@mui/icons-material/WorkRounded';
import ContactsRoundedIcon from '@mui/icons-material/ContactsRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import { SitemarkIcon } from './CustomIcons';

const items = [
  {
    icon: <WorkRoundedIcon sx={{ color: 'text.secondary' }} />,
    title: 'Track Applications',
    description:
      'Organize all your job applications in one place with status tracking, follow-ups, and detailed notes.',
  },
  {
    icon: <ContactsRoundedIcon sx={{ color: 'text.secondary' }} />,
    title: 'Manage Contacts',
    description:
      'Build and maintain your professional network with contact management and relationship tracking.',
  },
  {
    icon: <DescriptionRoundedIcon sx={{ color: 'text.secondary' }} />,
    title: 'Resume & Cover Letters',
    description:
      'Upload multiple resume versions and generate personalized cover letters instantly.',
  },
  {
    icon: <AnalyticsRoundedIcon sx={{ color: 'text.secondary' }} />,
    title: 'Success Analytics',
    description:
      'Analyze your application success rates and optimize your job search strategy with detailed insights.',
  },
];

export default function Content() {
  return (
    <Stack
      sx={{ flexDirection: 'column', alignSelf: 'center', gap: 4, maxWidth: 450 }}
    >
      <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
        <SitemarkIcon />
      </Box>
      {items.map((item, index) => (
        <Stack key={index} direction="row" sx={{ gap: 2 }}>
          {item.icon}
          <div>
            <Typography gutterBottom sx={{ fontWeight: 'medium' }}>
              {item.title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {item.description}
            </Typography>
          </div>
        </Stack>
      ))}
    </Stack>
  );
}
