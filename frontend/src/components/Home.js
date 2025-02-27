import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Container, Row, Col, Card, Alert } from 'react-bootstrap';

// Environment settings
const IS_PRODUCTION = process.env.REACT_APP_ENV === 'production';

// Sample sources for the dropdown
const availableSources = [
	"Bloomberg", "Reuters", "CNBC", "Financial Times", 
	"Wall Street Journal", "MarketWatch", "Barron's"
];

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

	return (
		<Container className="pt-5">
			<Row className="justify-content-center mb-5">
				<Col md={8} className="text-center">
					<h1 className="display-4 mb-3">Financial Search Engine</h1>
					<p className="lead text-muted">
						Search for financial news across multiple sources
					</p>
				</Col>
			</Row>
			
			<Row className="justify-content-center">
				<Col md={8}>
					<Card className="shadow-sm">
						<Card.Body>
							<Form onSubmit={handleSearch}>
								<Row className="align-items-center mb-3">
									<Col>
										<Form.Control
											type="text"
											placeholder="Enter your search query (e.g. 'Apple' or 'NASDAQ')"
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
									<Card className="bg-light">
										<Card.Body>
											<Row className="mb-3">
												<Col md={4}>
													<Form.Group>
														<Form.Label>Source</Form.Label>
														<Form.Select
															value={advancedQueries.source}
															onChange={(e) => handleAdvancedChange('source', e.target.value)}
														>
															<option value="">All Sources</option>
															{availableSources.map((source) => (
																<option key={source} value={source}>
																	{source}
																</option>
															))}
														</Form.Select>
													</Form.Group>
												</Col>
												<Col md={4}>
													<Form.Group>
														<Form.Label>Time Range</Form.Label>
														<Form.Select
															value={advancedQueries.time_range}
															onChange={(e) => handleAdvancedChange('time_range', e.target.value)}
														>
															<option value="all">All Time</option>
															<option value="day">Past 24 Hours</option>
															<option value="week">Past Week</option>
															<option value="month">Past Month</option>
															<option value="year">Past Year</option>
														</Form.Select>
													</Form.Group>
												</Col>
												<Col md={4}>
													<Form.Group>
														<Form.Label>Sentiment</Form.Label>
														<Form.Select
															value={advancedQueries.sentiment}
															onChange={(e) => handleAdvancedChange('sentiment', e.target.value)}
														>
															<option value="all">All Sentiment</option>
															<option value="positive">Positive</option>
															<option value="negative">Negative</option>
															<option value="neutral">Neutral</option>
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
					<h3 className="text-center mb-4">Sample Searches</h3>
					<Row className="justify-content-center">
						{['Apple', 'Tesla', 'Bitcoin', 'Interest Rates', 'NASDAQ'].map((term) => (
							<Col xs={6} md={2} key={term} className="mb-3">
								<Button 
									variant="outline-secondary" 
									className="w-100"
									onClick={() => {
										setQuery(term);
										// Auto-submit after a short delay
										setTimeout(() => {
											navigate(`/results?query=${term}`);
										}, 300);
									}}
								>
									{term}
								</Button>
							</Col>
						))}
					</Row>
				</Col>
			</Row>
		</Container>
	);
}

export default Home;
