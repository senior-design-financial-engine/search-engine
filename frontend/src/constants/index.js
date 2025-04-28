// Available sources for filtering
export const availableSources = [
    'AP',
    'BBC',
    'CNBC',
    'CNN',
    'NPR',
    'Reddit'
];

// Time range options
export const timeRanges = [
    { value: 'all', label: 'All Time' },
    { value: '1d', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last Week' },
    { value: '30d', label: 'Last Month' },
    { value: '90d', label: 'Last 3 Months' }
];

// Sentiment options
export const sentiments = [
    { value: 'all', label: 'All Sentiments' },
    { value: 'positive', label: 'Positive', color: 'success' },
    { value: 'negative', label: 'Negative', color: 'danger' },
    { value: 'neutral', label: 'Neutral', color: 'info' }
]; 