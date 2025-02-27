import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Container, Row, Col, Card, Alert, Badge, ListGroup } from 'react-bootstrap';

// Environment settings
const IS_PRODUCTION = process.env.REACT_APP_ENV === 'production';
const USE_MOCK_API = process.env.REACT_APP_USE_MOCK_API === 'true';

// Sample sources from our mock data for the dropdown
const availableSources = [
	"Bloomberg", "Reuters", "CNBC", "Financial Times", 
	"Wall Street Journal", "MarketWatch", "Barron's"
];

// Sample time ranges
const timeRanges = [
	{ value: 'all', label: 'All Time' },
	{ value: 'day', label: 'Last 24 Hours' },
	{ value: 'week', label: 'Last Week' },
	{ value: 'month', label: 'Last Month' },
	{ value: 'year', label: 'Last Year' }
];

// Sample sentiment options
const sentiments = [
	{ value: 'all', label: 'All Sentiments' },
	{ value: 'positive', label: 'Positive', color: 'success' },
	{ value: 'negative', label: 'Negative', color: 'danger' },
	{ value: 'neutral', label: 'Neutral', color: 'info' }
];

// Sample search examples organized by category
const searchExamples = {
	"Companies": [
		{ query: "Apple", description: "Latest news about Apple" },
		{ query: "Tesla", description: "Tesla company updates" },
		{ query: "Microsoft", description: "Microsoft news and developments" },
		{ query: "Amazon", description: "Amazon business news" }
	],
	"Topics": [
		{ query: "AI", description: "Artificial Intelligence developments" },
		{ query: "Earnings", description: "Recent earnings reports" },
		{ query: "Market", description: "Market trends and analysis" },
		{ query: "Energy", description: "News from the energy sector" }
	],
	"Industries": [
		{ query: "Technology", description: "Technology sector news" },
		{ query: "Finance", description: "Financial industry updates" },
		{ query: "Healthcare", description: "Healthcare sector developments" }
	],
	"Combined Searches": [
		{ query: "Apple AI", description: "Apple's AI initiatives" },
		{ query: "Tesla earnings", description: "Tesla earnings reports" },
		{ query: "Amazon market share", description: "Amazon's market position" }
	]
};

// RecentQueries component to show recent searches
const RecentQueries = ({ onSelectQuery }) => {
	const [recentQueries, setRecentQueries] = useState([]);

	useEffect(() => {
		// Load recent queries from localStorage
		const savedQueries = JSON.parse(localStorage.getItem('recentQueries')) || [];
		setRecentQueries(savedQueries);
	}, []);

	const handleQueryClick = (queryData) => {
		if (onSelectQuery) {
			onSelectQuery(queryData);
		}
	};

	const clearRecentQueries = () => {
		localStorage.removeItem('recentQueries');
		setRecentQueries([]);
	};

	if (recentQueries.length === 0) {
		return null;
	}

	// Function to render filter badges
	const renderFilterBadges = (filters) => {
		if (!filters) return null;
		
		const badges = [];
		
		if (filters.source) {
			badges.push(
				<Badge key="source" bg="info" className="me-1" pill>
					<i className="bi bi-newspaper me-1"></i>
					{filters.source}
				</Badge>
			);
		}
		
		if (filters.time_range && filters.time_range !== 'all') {
			const timeLabel = timeRanges.find(t => t.value === filters.time_range)?.label || filters.time_range;
			badges.push(
				<Badge key="time" bg="secondary" className="me-1" pill>
					<i className="bi bi-calendar me-1"></i>
					{timeLabel}
				</Badge>
			);
		}
		
		if (filters.sentiment && filters.sentiment !== 'all') {
			const sentimentInfo = sentiments.find(s => s.value === filters.sentiment);
			const label = sentimentInfo?.label || filters.sentiment;
			const color = sentimentInfo?.color || 'secondary';
			badges.push(
				<Badge key="sentiment" bg={color} className="me-1" pill>
					<i className="bi bi-emoji-smile me-1"></i>
					{label}
				</Badge>
			);
		}
		
		return badges.length ? <div className="mt-1">{badges}</div> : null;
	};

	// Function to get a summary of filters for screen readers and tooltips
	const getFilterSummary = (filters) => {
		if (!filters || Object.keys(filters).length === 0) return "No filters applied";
		
		const filterDescriptions = [];
		
		if (filters.source) {
			filterDescriptions.push(`Source: ${filters.source}`);
		}
		
		if (filters.time_range && filters.time_range !== 'all') {
			const timeLabel = timeRanges.find(t => t.value === filters.time_range)?.label || filters.time_range;
			filterDescriptions.push(`Time: ${timeLabel}`);
		}
		
		if (filters.sentiment && filters.sentiment !== 'all') {
			const sentimentInfo = sentiments.find(s => s.value === filters.sentiment);
			const label = sentimentInfo?.label || filters.sentiment;
			filterDescriptions.push(`Sentiment: ${label}`);
		}
		
		return filterDescriptions.join(', ');
	};

	return (
		<Card className="mt-3 shadow-sm border-0 rounded-3">
			<Card.Header className="d-flex justify-content-between align-items-center bg-white border-bottom py-3">
				<span className="fw-bold">
					<i className="bi bi-clock-history me-2 text-primary"></i>
					Recent Searches
				</span>
				<Button 
					variant="outline-danger" 
					size="sm" 
					onClick={clearRecentQueries}
					className="rounded-pill px-3"
				>
					<i className="bi bi-trash me-1"></i>
					Clear
				</Button>
			</Card.Header>
			<ListGroup variant="flush">
				{recentQueries.slice(0, 5).map((queryData, index) => (
					<ListGroup.Item 
						key={index} 
						action 
						onClick={() => handleQueryClick(queryData)}
						className="d-flex flex-column align-items-start py-3 transition-bg"
						title={typeof queryData !== 'string' ? getFilterSummary(queryData.filters) : "No filters applied"}
					>
						<div className="d-flex align-items-center w-100">
							<div className="search-query-text fw-medium">
								{typeof queryData === 'string' ? queryData : queryData.query}
							</div>
							<div className="ms-auto">
								{typeof queryData !== 'string' && Object.keys(queryData.filters || {}).length > 0 && (
									<Badge bg="light" text="dark" className="me-2 border">
										<i className="bi bi-funnel-fill me-1 text-secondary"></i>
										{Object.keys(queryData.filters || {}).length}
									</Badge>
								)}
								<i className="bi bi-search text-muted"></i>
							</div>
						</div>
						{typeof queryData !== 'string' && renderFilterBadges(queryData.filters)}
					</ListGroup.Item>
				))}
			</ListGroup>
		</Card>
	);
};

function Home() {
	const [query, setQuery] = useState('');
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [advancedQueries, setAdvancedQueries] = useState({
		source: '',
		time_range: 'all',
		sentiment: 'all'
	});
	const navigate = useNavigate();

	const saveRecentQuery = (searchQuery) => {
		// Create query object with filters
		const queryData = {
			query: searchQuery,
			filters: {},
			timestamp: new Date().toISOString() // Add timestamp for when the search was performed
		};
		
		// Add filters that have non-default values
		if (advancedQueries.source) {
			queryData.filters.source = advancedQueries.source;
		}
		
		if (advancedQueries.time_range !== 'all') {
			queryData.filters.time_range = advancedQueries.time_range;
		}
		
		if (advancedQueries.sentiment !== 'all') {
			queryData.filters.sentiment = advancedQueries.sentiment;
		}
		
		// Get existing recent queries
		const recentQueries = JSON.parse(localStorage.getItem('recentQueries')) || [];
		
		// Check if query exists (compare both query text and filters)
		const queryExists = recentQueries.some(existingQuery => {
			if (typeof existingQuery === 'string') {
				return existingQuery === searchQuery && Object.keys(queryData.filters).length === 0;
			}
			
			return existingQuery.query === searchQuery && 
				JSON.stringify(existingQuery.filters) === JSON.stringify(queryData.filters);
		});
		
		if (!queryExists) {
			// Add new query at the beginning
			const updatedQueries = [queryData, ...recentQueries.slice(0, 9)];
			localStorage.setItem('recentQueries', JSON.stringify(updatedQueries));
		} else {
			// If query exists, move it to the top and update timestamp
			const updatedQueries = [
				queryData,
				...recentQueries.filter(existingQuery => {
					if (typeof existingQuery === 'string') {
						return !(existingQuery === searchQuery && Object.keys(queryData.filters).length === 0);
					}
					
					return !(existingQuery.query === searchQuery && 
						JSON.stringify(existingQuery.filters) === JSON.stringify(queryData.filters));
				})
			].slice(0, 10);
			localStorage.setItem('recentQueries', JSON.stringify(updatedQueries));
		}
	};

	const handleSearch = (e) => {
		e.preventDefault();
		const searchParams = new URLSearchParams({ query });

		// Save the query to recent searches
		if (query.trim()) {
			saveRecentQuery(query.trim());
		}

		// Add advanced queries to search params
		for (const [key, value] of Object.entries(advancedQueries)) {
			if (value && value !== 'all') {
				searchParams.append(key, value);
			}
		}

		navigate(`/results?${searchParams.toString()}`);
	};

	const handleAdvancedChange = (field, value) => {
		setAdvancedQueries(prevState => ({...prevState, [field]: value}));
	};

	const handleExampleSearch = (searchQuery) => {
		setQuery(searchQuery);
		// Reset advanced filters
		setAdvancedQueries({
			source: '',
			time_range: 'all',
			sentiment: 'all'
		});
		
		// Save the example query to recent searches
		saveRecentQuery(searchQuery);
		
		// Auto-submit after a short delay
		setTimeout(() => {
			const searchParams = new URLSearchParams({ query: searchQuery });
			navigate(`/results?${searchParams.toString()}`);
		}, 300);
	};

	const handleExampleWithFilters = (searchQuery, filters) => {
		setQuery(searchQuery);
		setAdvancedQueries({...advancedQueries, ...filters});
		
		// Save the example query to recent searches with filters
		const queryData = {
			query: searchQuery,
			filters: filters,
			timestamp: new Date().toISOString()
		};
		
		// Get existing recent queries
		const recentQueries = JSON.parse(localStorage.getItem('recentQueries')) || [];
		
		// Add new query at the beginning
		const updatedQueries = [queryData, ...recentQueries.slice(0, 9)];
		localStorage.setItem('recentQueries', JSON.stringify(updatedQueries));
		
		// Auto-submit after a short delay
		setTimeout(() => {
			const searchParams = new URLSearchParams({ query: searchQuery });
			
			// Add the filters to the search params
			for (const [key, value] of Object.entries(filters)) {
				if (value && value !== 'all') {
					searchParams.append(key, value);
				}
			}
			
			navigate(`/results?${searchParams.toString()}`);
		}, 300);
	};

	const handleRecentQuerySelect = (queryData) => {
		if (typeof queryData === 'string') {
			setQuery(queryData);
			setAdvancedQueries({
				source: '',
				time_range: 'all',
				sentiment: 'all'
			});
			
			// Automatically submit the form after selecting a recent query
			setTimeout(() => {
				const searchParams = new URLSearchParams({ query: queryData });
				navigate(`/results?${searchParams.toString()}`);
			}, 300);
		} else {
			setQuery(queryData.query);
			
			// Set filters from saved query
			const newAdvancedQueries = {
				source: '',
				time_range: 'all',
				sentiment: 'all',
				...queryData.filters
			};
			setAdvancedQueries(newAdvancedQueries);
			
			// Automatically submit the form after selecting a recent query
			setTimeout(() => {
				const searchParams = new URLSearchParams({ query: queryData.query });
				
				// Add the filters to the search params
				for (const [key, value] of Object.entries(queryData.filters)) {
					if (value && value !== 'all') {
						searchParams.append(key, value);
					}
				}
				
				navigate(`/results?${searchParams.toString()}`);
			}, 300);
		}
	};

	return (
		<Container className="pt-5">
			<Row className="justify-content-center mb-5">
				<Col md={8} className="text-center">
					<h1 className="display-4 mb-3 fw-bold">Financial Search Engine</h1>
					<p className="lead text-secondary">
						Search for financial news across multiple sources with advanced filtering
					</p>
					{IS_PRODUCTION && USE_MOCK_API && (
						<Alert variant="info" className="mt-3">
							<small>Running with mock data in production environment</small>
						</Alert>
					)}
				</Col>
			</Row>
			
			<Row className="justify-content-center">
				<Col md={10}>
					<Card className="shadow-lg border-0 rounded-4">
						<Card.Body className="p-4">
							<Form onSubmit={handleSearch}>
								<Row className="align-items-center mb-3">
									<Col>
										<div className="search-input-wrapper position-relative">
											<i className="bi bi-search position-absolute start-0 top-50 translate-middle-y ms-3 text-secondary"></i>
											<Form.Control
												type="text"
												placeholder="Enter your search query (e.g. 'Apple' or 'AI')"
												value={query}
												onChange={(e) => setQuery(e.target.value)}
												className="form-control-lg rounded-pill ps-5"
												required
											/>
										</div>
									</Col>
									<Col xs="auto">
										<Button type="submit" variant="primary" size="lg" className="rounded-pill px-4">
											<i className="bi bi-search me-1"></i> Search
										</Button>
									</Col>
								</Row>
								
								{/* Recent Queries Component */}
								<RecentQueries onSelectQuery={handleRecentQuerySelect} />
								
								<div className="d-flex justify-content-end mb-3">
									<Button 
										variant="link" 
										onClick={() => setShowAdvanced(!showAdvanced)}
										className="text-decoration-none"
									>
										<i className={`bi bi-sliders me-1 ${showAdvanced ? 'text-primary' : ''}`}></i>
										{showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
									</Button>
								</div>

								{showAdvanced && (
									<Card className="bg-light mb-3 border-0 rounded-3">
										<Card.Body>
											<Row>
												<Col md={4}>
													<Form.Group className="mb-3">
														<Form.Label>Source</Form.Label>
														<Form.Select
															value={advancedQueries.source}
															onChange={(e) => handleAdvancedChange('source', e.target.value)}
															className="rounded-3"
														>
															<option value="">All Sources</option>
															{availableSources.map(source => (
																<option key={source} value={source}>{source}</option>
															))}
														</Form.Select>
													</Form.Group>
												</Col>
												<Col md={4}>
													<Form.Group className="mb-3">
														<Form.Label>Time Range</Form.Label>
														<Form.Select
															value={advancedQueries.time_range}
															onChange={(e) => handleAdvancedChange('time_range', e.target.value)}
															className="rounded-3"
														>
															{timeRanges.map(range => (
																<option key={range.value} value={range.value}>{range.label}</option>
															))}
														</Form.Select>
													</Form.Group>
												</Col>
												<Col md={4}>
													<Form.Group className="mb-3">
														<Form.Label>Sentiment</Form.Label>
														<Form.Select
															value={advancedQueries.sentiment}
															onChange={(e) => handleAdvancedChange('sentiment', e.target.value)}
															className="rounded-3"
														>
															{sentiments.map(sentiment => (
																<option key={sentiment.value} value={sentiment.value}>{sentiment.label}</option>
															))}
														</Form.Select>
													</Form.Group>
												</Col>
											</Row>
										</Card.Body>
									</Card>
								)}
							</Form>
						</Card.Body>
					</Card>
				</Col>
			</Row>

			<Row className="mt-5">
				<Col>
					<h3 className="text-center mb-4 fw-bold">
						<i className="bi bi-lightning-charge text-primary me-2"></i>
						Quick Search Examples
					</h3>
					<div className="d-flex justify-content-center flex-wrap">
						{['Apple', 'Tesla', 'AI', 'Market', 'Earnings'].map((term) => (
							<Button 
								key={term}
								variant="outline-primary" 
								className="m-1 rounded-pill px-4"
								onClick={() => handleExampleSearch(term)}
							>
								{term}
							</Button>
						))}
					</div>
				</Col>
			</Row>
			
			<Row className="mt-5">
				<Col>
					<h3 className="text-center mb-4 fw-bold">
						<i className="bi bi-filter text-primary me-2"></i>
						Advanced Search & Filter Demos
					</h3>
					<Row>
						<Col md={6} lg={3} className="mb-4">
							<Card className="h-100 shadow-sm border-0 rounded-3 hover-lift">
								<Card.Header className="bg-primary text-white border-0 rounded-top-3">
									<i className="bi bi-newspaper me-2"></i>
									Source Filtering
								</Card.Header>
								<Card.Body>
									<p className="card-text">See how results change when filtered by source</p>
									<div className="mb-3">
										<Button 
											variant="outline-secondary" 
											size="sm"
											className="m-1 rounded-pill"
											onClick={() => handleExampleWithFilters('Tesla', {source: 'Bloomberg'})}
										>
											Tesla in Bloomberg
										</Button>
										<Button 
											variant="outline-secondary" 
											size="sm"
											className="m-1 rounded-pill"
											onClick={() => handleExampleWithFilters('Tesla', {source: 'Reuters'})}
										>
											Tesla in Reuters
										</Button>
									</div>
								</Card.Body>
							</Card>
						</Col>
						
						<Col md={6} lg={3} className="mb-4">
							<Card className="h-100 shadow-sm border-0 rounded-3 hover-lift">
								<Card.Header className="bg-success text-white border-0 rounded-top-3">
									<i className="bi bi-emoji-smile me-2"></i>
									Sentiment Analysis
								</Card.Header>
								<Card.Body>
									<p className="card-text">Filter results by positive, negative, or neutral sentiment</p>
									<div className="mb-3">
										{sentiments.filter(s => s.value !== 'all').map(sentiment => (
											<Button 
												key={sentiment.value}
												variant={`outline-${sentiment.color}`}
												size="sm"
												className="m-1 rounded-pill"
												onClick={() => handleExampleWithFilters('Apple', {sentiment: sentiment.value})}
											>
												Apple ({sentiment.label})
											</Button>
										))}
									</div>
								</Card.Body>
							</Card>
						</Col>
						
						<Col md={6} lg={3} className="mb-4">
							<Card className="h-100 shadow-sm border-0 rounded-3 hover-lift">
								<Card.Header className="bg-info text-white border-0 rounded-top-3">
									<i className="bi bi-calendar-event me-2"></i>
									Time Range Filtering
								</Card.Header>
								<Card.Body>
									<p className="card-text">See how results change when filtered by time periods</p>
									<div className="mb-3">
										<Button 
											variant="outline-secondary" 
											size="sm"
											className="m-1 rounded-pill"
											onClick={() => handleExampleWithFilters('Market', {time_range: 'day'})}
										>
											Market (24h)
										</Button>
										<Button 
											variant="outline-secondary" 
											size="sm"
											className="m-1 rounded-pill"
											onClick={() => handleExampleWithFilters('Market', {time_range: 'week'})}
										>
											Market (Week)
										</Button>
									</div>
								</Card.Body>
							</Card>
						</Col>
						
						<Col md={6} lg={3} className="mb-4">
							<Card className="h-100 shadow-sm border-0 rounded-3 hover-lift">
								<Card.Header className="bg-warning text-dark border-0 rounded-top-3">
									<i className="bi bi-layers me-2"></i>
									Combined Filters
								</Card.Header>
								<Card.Body>
									<p className="card-text">Try searches with multiple filters applied</p>
									<div className="mb-3">
										<Button 
											variant="outline-secondary" 
											size="sm"
											className="m-1 rounded-pill"
											onClick={() => handleExampleWithFilters('Earnings', {
												source: 'Financial Times',
												sentiment: 'positive'
											})}
										>
											Positive Earnings in FT
										</Button>
										<Button 
											variant="outline-secondary" 
											size="sm"
											className="m-1 rounded-pill"
											onClick={() => handleExampleWithFilters('AI', {
												time_range: 'month',
												sentiment: 'neutral'
											})}
										>
											AI (Monthly, Neutral)
										</Button>
									</div>
								</Card.Body>
							</Card>
						</Col>
					</Row>
				</Col>
			</Row>
			
			<Row className="mt-4 mb-5">
				<Col>
					<h4 className="text-center mb-4 fw-bold">
						<i className="bi bi-collection text-primary me-2"></i>
						Search Suggestions by Category
					</h4>
					<Card className="shadow-sm border-0 rounded-3">
						<Card.Body className="p-4">
							<Row>
								{Object.entries(searchExamples).map(([category, examples]) => (
									<Col md={6} lg={3} key={category} className="mb-3">
										<h5 className="fw-bold">{category}</h5>
										<ul className="list-unstyled">
											{examples.map((example, idx) => (
												<li key={idx} className="mb-2">
													<Button
														variant="link"
														className="text-decoration-none p-0 text-primary"
														onClick={() => handleExampleSearch(example.query)}
													>
														<i className="bi bi-arrow-right-circle me-1"></i>
														{example.query}
													</Button>
													<small className="text-muted d-block ms-4">{example.description}</small>
												</li>
											))}
										</ul>
									</Col>
								))}
							</Row>
						</Card.Body>
					</Card>
				</Col>
			</Row>
		</Container>
	);
}

export default Home;
