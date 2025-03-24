import React, { useState, useEffect } from 'react';
import { Card, Button, Spinner, Alert, Tabs, Tab, Table, Badge, Accordion } from 'react-bootstrap';
import { getFullDiagnosticReport } from '../../services/api';

const AdvancedDiagnostics = () => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('system');

  useEffect(() => {
    // Run diagnostics automatically when component mounts
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getFullDiagnosticReport();
      setReport(data);
    } catch (err) {
      setError(err.message || 'Failed to load diagnostic data');
      console.error('Diagnostic error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status" variant="primary" />
        <p className="mt-3">Running comprehensive diagnostics...</p>
        <p className="text-muted small">This may take a few moments</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Diagnostics Failed</Alert.Heading>
        <p>{error}</p>
        <div className="d-flex justify-content-end">
          <Button variant="outline-danger" onClick={runDiagnostics}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  if (!report) {
    return (
      <div className="text-center p-4">
        <p>No diagnostic data available</p>
        <Button variant="primary" onClick={runDiagnostics}>
          <i className="bi bi-stethoscope me-1"></i>
          Run Diagnostics
        </Button>
      </div>
    );
  }

  return (
    <>
      <Alert variant="info" className="mb-3">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <Alert.Heading>System Diagnostic Report</Alert.Heading>
            <p className="mb-0">
              Generated at {new Date(report.timestamp).toLocaleString()}
            </p>
          </div>
          <Button 
            variant="outline-primary"
            onClick={runDiagnostics}
            size="sm"
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </Button>
        </div>
      </Alert>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-3"
      >
        <Tab eventKey="system" title="System">
          <SystemDiagnostics system={report.system} />
        </Tab>
        <Tab eventKey="elasticsearch" title="Elasticsearch">
          <ElasticsearchDiagnostics elasticsearch={report.elasticsearch} />
        </Tab>
        <Tab eventKey="errors" title="Errors">
          <ErrorsDiagnostics errors={report.recent_errors} />
        </Tab>
        <Tab eventKey="network" title="Network">
          <NetworkDiagnostics network={report.network} />
        </Tab>
      </Tabs>
    </>
  );
};

const SystemDiagnostics = ({ system }) => {
  if (!system) return <Alert variant="warning">No system information available</Alert>;
  
  return (
    <Card>
      <Card.Body>
        <h5 className="border-bottom pb-2 mb-3">System Information</h5>
        <Table striped bordered>
          <tbody>
            <tr>
              <th width="30%">Hostname</th>
              <td>{system.hostname}</td>
            </tr>
            <tr>
              <th>Platform</th>
              <td>{system.platform} {system.platform_version}</td>
            </tr>
            <tr>
              <th>Python Version</th>
              <td>{system.python_version}</td>
            </tr>
            <tr>
              <th>CPU Usage</th>
              <td>
                <div className="d-flex align-items-center">
                  <div className="progress flex-grow-1 me-2" style={{ height: '20px' }}>
                    <div 
                      className="progress-bar" 
                      role="progressbar"
                      style={{ width: `${system.cpu?.percent}%` }} 
                      aria-valuenow={system.cpu?.percent} 
                      aria-valuemin="0" 
                      aria-valuemax="100"
                    >
                      {system.cpu?.percent}%
                    </div>
                  </div>
                  <span>Cores: {system.cpu?.count}</span>
                </div>
              </td>
            </tr>
            <tr>
              <th>Memory Usage</th>
              <td>
                <div className="progress mb-2" style={{ height: '20px' }}>
                  <div 
                    className="progress-bar" 
                    role="progressbar"
                    style={{ width: `${system.memory?.percent_used}%` }} 
                    aria-valuenow={system.memory?.percent_used} 
                    aria-valuemin="0" 
                    aria-valuemax="100"
                  >
                    {system.memory?.percent_used}%
                  </div>
                </div>
                <div className="small">
                  {Math.round(system.memory?.used / (1024 * 1024))} MB used of {Math.round(system.memory?.total / (1024 * 1024))} MB total
                </div>
              </td>
            </tr>
            <tr>
              <th>Disk Usage</th>
              <td>
                <div className="progress mb-2" style={{ height: '20px' }}>
                  <div 
                    className="progress-bar" 
                    role="progressbar"
                    style={{ width: `${system.disk?.percent_used}%` }} 
                    aria-valuenow={system.disk?.percent_used} 
                    aria-valuemin="0" 
                    aria-valuemax="100"
                  >
                    {system.disk?.percent_used}%
                  </div>
                </div>
                <div className="small">
                  {Math.round(system.disk?.used / (1024 * 1024 * 1024))} GB used of {Math.round(system.disk?.total / (1024 * 1024 * 1024))} GB total
                </div>
              </td>
            </tr>
            <tr>
              <th>System Uptime</th>
              <td>{Math.floor(system.uptime?.system / 60 / 60)} hours, {Math.floor((system.uptime?.system / 60) % 60)} minutes</td>
            </tr>
            <tr>
              <th>Process Uptime</th>
              <td>{Math.floor(system.uptime?.process / 60)} minutes</td>
            </tr>
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
};

const ElasticsearchDiagnostics = ({ elasticsearch }) => {
  if (!elasticsearch) return <Alert variant="warning">No Elasticsearch information available</Alert>;
  
  return (
    <Card>
      <Card.Body>
        <h5 className="border-bottom pb-2 mb-3">Elasticsearch Connectivity</h5>
        
        <Alert variant={elasticsearch.success ? 'success' : 'danger'}>
          <Alert.Heading>
            {elasticsearch.success ? 'Connection Successful' : 'Connection Failed'}
          </Alert.Heading>
          {!elasticsearch.success && elasticsearch.error && (
            <p><strong>Error:</strong> {elasticsearch.error}</p>
          )}
          <p className="mb-0">
            <strong>URL:</strong> {elasticsearch.elasticsearch_url}
          </p>
        </Alert>
        
        {elasticsearch.ping && (
          <div className="mt-4">
            <h5 className="border-bottom pb-2 mb-3">Network Ping</h5>
            <Table striped bordered>
              <tbody>
                <tr>
                  <th width="30%">Status</th>
                  <td>
                    <Badge bg={elasticsearch.ping.success ? 'success' : 'danger'}>
                      {elasticsearch.ping.success ? 'Success' : 'Failed'}
                    </Badge>
                  </td>
                </tr>
                <tr>
                  <th>Packets</th>
                  <td>{elasticsearch.ping.packets_received} received of {elasticsearch.ping.packets_sent} sent</td>
                </tr>
                <tr>
                  <th>Packet Loss</th>
                  <td>{elasticsearch.ping.packet_loss_percent}%</td>
                </tr>
                {elasticsearch.ping.avg_latency_ms && (
                  <tr>
                    <th>Latency</th>
                    <td>
                      Min: {elasticsearch.ping.min_latency_ms}ms / 
                      Avg: {elasticsearch.ping.avg_latency_ms}ms / 
                      Max: {elasticsearch.ping.max_latency_ms}ms
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
        
        {elasticsearch.connection && (
          <div className="mt-4">
            <h5 className="border-bottom pb-2 mb-3">HTTP Connection</h5>
            <Table striped bordered>
              <tbody>
                <tr>
                  <th width="30%">Status</th>
                  <td>
                    <Badge bg={elasticsearch.connection.success ? 'success' : 'danger'}>
                      {elasticsearch.connection.success ? 'Success' : 'Failed'}
                    </Badge>
                  </td>
                </tr>
                <tr>
                  <th>Status Code</th>
                  <td>{elasticsearch.connection.status_code || 'N/A'}</td>
                </tr>
                <tr>
                  <th>DNS Resolution</th>
                  <td>
                    <Badge bg={elasticsearch.connection.dns_resolved ? 'success' : 'danger'}>
                      {elasticsearch.connection.dns_resolved ? 'Success' : 'Failed'}
                    </Badge>
                    {elasticsearch.connection.ip_address && ` (${elasticsearch.connection.ip_address})`}
                  </td>
                </tr>
                <tr>
                  <th>Response Time</th>
                  <td>{elasticsearch.connection.total_latency_ms?.toFixed(2) || 'N/A'} ms</td>
                </tr>
                {elasticsearch.connection.error && (
                  <tr>
                    <th>Error</th>
                    <td className="text-danger">{elasticsearch.connection.error}</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
        
        {elasticsearch.query && (
          <div className="mt-4">
            <h5 className="border-bottom pb-2 mb-3">Query Test</h5>
            <Table striped bordered>
              <tbody>
                <tr>
                  <th width="30%">Status</th>
                  <td>
                    <Badge bg={elasticsearch.query.success ? 'success' : 'danger'}>
                      {elasticsearch.query.success ? 'Success' : 'Failed'}
                    </Badge>
                  </td>
                </tr>
                {elasticsearch.query.status_code && (
                  <tr>
                    <th>Status Code</th>
                    <td>{elasticsearch.query.status_code}</td>
                  </tr>
                )}
                {elasticsearch.query.hit_count !== undefined && (
                  <tr>
                    <th>Documents Found</th>
                    <td>{elasticsearch.query.hit_count}</td>
                  </tr>
                )}
                {elasticsearch.query.sample_document_fields && (
                  <tr>
                    <th>Document Fields</th>
                    <td>
                      {elasticsearch.query.sample_document_fields.map(field => (
                        <Badge key={field} bg="secondary" className="me-1 mb-1">{field}</Badge>
                      ))}
                    </td>
                  </tr>
                )}
                {elasticsearch.query.error && (
                  <tr>
                    <th>Error</th>
                    <td className="text-danger">{elasticsearch.query.error}</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

const ErrorsDiagnostics = ({ errors = [] }) => {
  if (!errors || errors.length === 0) {
    return (
      <Alert variant="success">
        <Alert.Heading>No Recent Errors</Alert.Heading>
        <p className="mb-0">No backend errors have been recorded recently.</p>
      </Alert>
    );
  }
  
  return (
    <Card>
      <Card.Body>
        <h5 className="border-bottom pb-2 mb-3">Recent Backend Errors ({errors.length})</h5>
        
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {errors.map((error, index) => (
            <Alert key={index} variant="danger" className="mb-2">
              {error.timestamp && (
                <div className="small mb-1">
                  {new Date(error.timestamp).toLocaleString()}
                </div>
              )}
              
              {error.level && (
                <Badge bg="warning" text="dark" className="me-2">
                  {error.level}
                </Badge>
              )}
              
              <div className="mt-1 mb-1">
                <strong>{error.message || error.raw || 'Unknown error'}</strong>
              </div>
              
              {error.exception && (
                <Accordion className="mt-2">
                  <Accordion.Item eventKey="0">
                    <Accordion.Header>Exception Details</Accordion.Header>
                    <Accordion.Body>
                      <div><strong>Type:</strong> {error.exception.type}</div>
                      <div><strong>Message:</strong> {error.exception.value}</div>
                      {error.exception.traceback && (
                        <pre className="mt-2 bg-dark text-light p-2 small">
                          {error.exception.traceback.join('\n')}
                        </pre>
                      )}
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>
              )}
            </Alert>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
};

const NetworkDiagnostics = ({ network }) => {
  if (!network) return <Alert variant="warning">No network diagnostics available</Alert>;
  
  // Handle case where network data might be in different formats depending on the API
  const tests = network.tests || {};
  
  return (
    <Card>
      <Card.Body>
        <h5 className="border-bottom pb-2 mb-3">Network Diagnostics</h5>
        
        {Object.keys(tests).length === 0 ? (
          <Alert variant="info">No network tests were performed</Alert>
        ) : (
          <Accordion defaultActiveKey="0">
            {Object.entries(tests).map(([target, results], index) => (
              <Accordion.Item key={target} eventKey={index.toString()}>
                <Accordion.Header>
                  <div className="d-flex align-items-center w-100">
                    <span className="me-auto">{target}</span>
                    {results.http && (
                      <Badge bg={results.http.success ? 'success' : 'danger'} className="me-2">
                        HTTP: {results.http.success ? 'Success' : 'Failed'}
                      </Badge>
                    )}
                    {results.ping && (
                      <Badge bg={results.ping.success ? 'success' : 'danger'} className="me-2">
                        Ping: {results.ping.success ? 'Success' : 'Failed'}
                      </Badge>
                    )}
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  {results.ping && (
                    <div className="mb-3">
                      <h6>Ping Results</h6>
                      <Table striped bordered size="sm">
                        <tbody>
                          <tr>
                            <th width="30%">Status</th>
                            <td>
                              <Badge bg={results.ping.success ? 'success' : 'danger'}>
                                {results.ping.success ? 'Success' : 'Failed'}
                              </Badge>
                            </td>
                          </tr>
                          <tr>
                            <th>Packet Loss</th>
                            <td>{results.ping.packet_loss_percent}%</td>
                          </tr>
                          {results.ping.avg_latency_ms && (
                            <tr>
                              <th>Average Latency</th>
                              <td>{results.ping.avg_latency_ms} ms</td>
                            </tr>
                          )}
                          {results.ping.error && (
                            <tr>
                              <th>Error</th>
                              <td className="text-danger">{results.ping.error}</td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    </div>
                  )}
                  
                  {results.http && (
                    <div className="mb-3">
                      <h6>HTTP Connection</h6>
                      <Table striped bordered size="sm">
                        <tbody>
                          <tr>
                            <th width="30%">Status</th>
                            <td>
                              <Badge bg={results.http.success ? 'success' : 'danger'}>
                                {results.http.success ? 'Success' : 'Failed'}
                              </Badge>
                            </td>
                          </tr>
                          <tr>
                            <th>Status Code</th>
                            <td>{results.http.status_code || 'N/A'}</td>
                          </tr>
                          <tr>
                            <th>Response Time</th>
                            <td>{results.http.total_latency_ms?.toFixed(2) || 'N/A'} ms</td>
                          </tr>
                          {results.http.error && (
                            <tr>
                              <th>Error</th>
                              <td className="text-danger">{results.http.error}</td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    </div>
                  )}
                  
                  {results.traceroute && (
                    <div>
                      <h6>Traceroute</h6>
                      <Table striped bordered size="sm">
                        <tbody>
                          <tr>
                            <th width="30%">Status</th>
                            <td>
                              <Badge bg={results.traceroute.success ? 'success' : 'danger'}>
                                {results.traceroute.success ? 'Success' : 'Failed'}
                              </Badge>
                            </td>
                          </tr>
                          <tr>
                            <th>Destination Reached</th>
                            <td>
                              <Badge bg={results.traceroute.reached_destination ? 'success' : 'danger'}>
                                {results.traceroute.reached_destination ? 'Yes' : 'No'}
                              </Badge>
                            </td>
                          </tr>
                          {results.traceroute.error && (
                            <tr>
                              <th>Error</th>
                              <td className="text-danger">{results.traceroute.error}</td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        )}
      </Card.Body>
    </Card>
  );
};

export default AdvancedDiagnostics; 