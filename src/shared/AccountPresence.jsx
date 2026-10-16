import { useEffect, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

const formatLastActive = (timestamp, now) => {
  const lastActive = new Date(timestamp);
  if (Number.isNaN(lastActive.getTime())) return 'Activity unavailable';

  const elapsedSeconds = Math.max(0, Math.floor((now - lastActive.getTime()) / 1000));
  if (elapsedSeconds < 60) return 'Active just now';
  if (elapsedSeconds < 3600) {
    const minutes = Math.floor(elapsedSeconds / 60);
    return `Active ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (elapsedSeconds < 86400) {
    const hours = Math.floor(elapsedSeconds / 3600);
    return `Active ${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (elapsedSeconds < 30 * 86400) {
    const days = Math.floor(elapsedSeconds / 86400);
    return `Active ${days} day${days === 1 ? '' : 's'} ago`;
  }
  if (elapsedSeconds < 365 * 86400) {
    const months = Math.floor(elapsedSeconds / (30 * 86400));
    return `Active ${months} month${months === 1 ? '' : 's'} ago`;
  }

  const years = Math.floor(elapsedSeconds / (365 * 86400));
  return `Active ${years} year${years === 1 ? '' : 's'} ago`;
};

const AccountPresence = ({ lastActiveAt, isConfirmed }) => {
  const [now, setNow] = useState(Date.now());
  const hasLastActive = Boolean(lastActiveAt);
  const lastActiveTime = hasLastActive ? new Date(lastActiveAt).getTime() : NaN;
  const hasNoActivity = isConfirmed === false || !hasLastActive;
  const isOnline = !hasNoActivity && Number.isFinite(lastActiveTime) && now - lastActiveTime < ONLINE_THRESHOLD_MS;
  const activityLabel = hasNoActivity
    ? 'No activity yet'
    : isOnline
      ? 'Active now'
      : formatLastActive(lastActiveAt, now);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
      <Box
        aria-label={hasNoActivity ? 'No activity yet' : isOnline ? 'Online now' : 'Offline'}
        sx={{
          width: 8,
          height: 8,
          flexShrink: 0,
          borderRadius: '50%',
          bgcolor: isOnline ? '#22c55e' : '#94a3b8',
        }}
      />
      <Typography variant="caption" color={isOnline ? 'success.main' : 'text.secondary'}>
        {activityLabel}
      </Typography>
    </Stack>
  );
};

export default AccountPresence;
