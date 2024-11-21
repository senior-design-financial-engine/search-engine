import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Container, Row, Col } from 'react-bootstrap';

function Home() {
	const [query, setQuery] = useState('');
	// const [advancedQueries, setAdvancedQueries] = useState({ filters: '', time_range: '' });
	const [advancedQueries, setAdvancedQueries] = useState({});
	const navigate = useNavigate();


	const handleSearch = (e) => {
		e.preventDefault();
		const searchParams = new URLSearchParams({ query });

		// Add advanced queries to search params
		for (const [key, value] of Object.entries(advancedQueries)) {
			searchParams.append(key, value);
		}

		navigate(`/results?${searchParams.toString()}`);
	};


	const handleAdvancedChange = (field, value) => {
		console.log(value)
		setAdvancedQueries(advancedQueries => ({...advancedQueries, [field]: value}));
	};

	return (
		<Container className="text-center mt-5">
			<h1>Financial Search Engine</h1>
			<Form onSubmit={handleSearch}>
				<Row className="justify-content-center mb-4">
					<Col md={6}>
						<Form.Control
							type="text"
							placeholder="Enter your search query"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
						/>
					</Col>
					<Col md="auto">
						<Button type="submit" variant="primary">
							Search
						</Button>
					</Col>
				</Row>

				{/* <h4 className="mb-3">Filters</h4>
				<Row className="justify-content-center mb-3">
					<Col md={2}>
						Source
					</Col>
					<Col md={2}>
						<Form.Control
							type="text"
							placeholder="e.g. bbc"
							value={advancedQueries.time}
							onChange={(e) => handleAdvancedChange('source', e.target.value)}
						/>
					</Col>
				</Row> */}
			</Form>
		</Container>
	);
}

export default Home;
