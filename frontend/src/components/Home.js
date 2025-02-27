import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Container, Row, Col, Card, Alert, Badge } from 'react-bootstrap';

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

function Home() {
	const [query, setQuery] = useState('');
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [advancedQueries, setAdvancedQueries] = useState({
		source: '',
		time_range: 'all',
		sentiment: 'all'
	});
	const navigate = useNavigate();

	const handleSearch = (e) => {
		e.preventDefault();
		const searchParams = new URLSearchParams({ query });

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
		// Auto-submit after a short delay
		setTimeout(() => {
			const searchParams = new URLSearchParams({ query: searchQuery });
			navigate(`/results?${searchParams.toString()}`);
		}, 300);
	};

	const handleExampleWithFilters = (searchQuery, filters) => {
		setQuery(searchQuery);
		setAdvancedQueries({...advancedQueries, ...filters});
		
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

	return (
		<Container className="pt-5">
			<Row className="justify-content-center mb-5">
				<Col md={8} className="text-center">
					<h1 className="display-4 mb-3">Financial Search Engine</h1>
					<p className="lead text-muted">
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
					<Card className="shadow">
						<Card.Body>
							<Form onSubmit={handleSearch}>
								<Row className="align-items-center mb-3">
									<Col>
										<Form.Control
											type="text"
											placeholder="Enter your search query (e.g. 'Apple' or 'AI')"
											value={query}
											onChange={(e) => setQuery(e.target.value)}
											className="form-control-lg"
											required
										/>
									</Col>
									<Col xs="auto">
										<Button type="submit" variant="primary" size="lg">
											Search
										</Button>
									</Col>
								</Row>
								
								<div className="d-flex justify-content-end mb-3">
									<Button 
										variant="link" 
										onClick={() => setShowAdvanced(!showAdvanced)}
										className="text-decoration-none"
									>
										{showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
									</Button>
								</div>

								{showAdvanced && (
									<Card className="bg-light mb-3">
										<Card.Body>
											<Row>
												<Col md={4}>
													<Form.Group className="mb-3">
														<Form.Label>Source</Form.Label>
														<Form.Select
															value={advancedQueries.source}
															onChange={(e) => handleAdvancedChange('source', e.target.value)}
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
					<h3 className="text-center mb-4">Quick Search Examples</h3>
					<div className="d-flex justify-content-center flex-wrap">
						{['Apple', 'Tesla', 'AI', 'Market', 'Earnings'].map((term) => (
							<Button 
								key={term}
								variant="outline-primary" 
								className="m-1"
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
					<h3 className="text-center mb-4">Advanced Search & Filter Demos</h3>
					<Row>
						<Col md={6} lg={3} className="mb-4">
							<Card className="h-100 shadow-sm">
								<Card.Header className="bg-primary text-white">
									Source Filtering
								</Card.Header>
								<Card.Body>
									<p className="card-text">See how results change when filtered by source</p>
									<div className="mb-3">
										<Button 
											variant="outline-secondary" 
											size="sm"
											className="m-1"
											onClick={() => handleExampleWithFilters('Tesla', {source: 'Bloomberg'})}
										>
											Tesla in Bloomberg
										</Button>
										<Button 
											variant="outline-secondary" 
											size="sm"
											className="m-1"
											onClick={() => handleExampleWithFilters('Tesla', {source: 'Reuters'})}
										>
											Tesla in Reuters
										</Button>
									</div>
								</Card.Body>
							</Card>
						</Col>
						
						<Col md={6} lg={3} className="mb-4">
							<Card className="h-100 shadow-sm">
								<Card.Header className="bg-success text-white">
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
												className="m-1"
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
							<Card className="h-100 shadow-sm">
								<Card.Header className="bg-info text-white">
									Time Range Filtering
								</Card.Header>
								<Card.Body>
									<p className="card-text">See how results change when filtered by time periods</p>
									<div className="mb-3">
										<Button 
											variant="outline-secondary" 
											size="sm"
											className="m-1"
											onClick={() => handleExampleWithFilters('Market', {time_range: 'day'})}
										>
											Market (24h)
										</Button>
										<Button 
											variant="outline-secondary" 
											size="sm"
											className="m-1"
											onClick={() => handleExampleWithFilters('Market', {time_range: 'week'})}
										>
											Market (Week)
										</Button>
									</div>
								</Card.Body>
							</Card>
						</Col>
						
						<Col md={6} lg={3} className="mb-4">
							<Card className="h-100 shadow-sm">
								<Card.Header className="bg-warning text-dark">
									Combined Filters
								</Card.Header>
								<Card.Body>
									<p className="card-text">Try searches with multiple filters applied</p>
									<div className="mb-3">
										<Button 
											variant="outline-secondary" 
											size="sm"
											className="m-1"
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
											className="m-1"
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
					<h4 className="text-center mb-4">Search Suggestions by Category</h4>
					<Card>
						<Card.Body>
							<Row>
								{Object.entries(searchExamples).map(([category, examples]) => (
									<Col md={6} lg={3} key={category} className="mb-3">
										<h5>{category}</h5>
										<ul className="list-unstyled">
											{examples.map((example, idx) => (
												<li key={idx} className="mb-2">
													<Button
														variant="link"
														className="text-decoration-none p-0"
														onClick={() => handleExampleSearch(example.query)}
													>
														{example.query}
													</Button>
													<small className="text-muted d-block">{example.description}</small>
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
