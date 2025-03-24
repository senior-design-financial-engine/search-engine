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
      console.log('Diagnostic Report Data:', data); // Debug - log the received data
      
      // Ensure the data has the expected structure with fallbacks
      const processedData = {
        timestamp: data?.timestamp || new Date().toISOString(),
        system: data?.system || {},
        elasticsearch: data?.elasticsearch || {},
        recent_errors: data?.recent_errors || [],
        network: data?.network || { tests: {} }
      };
      
      setReport(processedData);
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
  
  // Create safe versions of nested objects to prevent undefined errors
  const cpu = system.cpu || {};
  const memory = system.memory || {};
  const disk = system.disk || {};
  const uptime = system.uptime || { system: 0, process: 0 };
  
  return (
    <Card>
      <Card.Body>
        <h5 className="border-bottom pb-2 mb-3">System Information</h5>
        <Table striped bordered>
          <tbody>
            <tr>
              <th width="30%">Hostname</th>
              <td>{system.hostname || 'Unknown'}</td>
            </tr>
            <tr>
              <th>Platform</th>
              <td>{system.platform || 'Unknown'} {system.platform_version || ''}</td>
            </tr>
            <tr>
              <th>Python Version</th>
              <td>{system.python_version || 'Unknown'}</td>
            </tr>
            <tr>
              <th>CPU Usage</th>
              <td>
                <div className="d-flex align-items-center">
                  <div className="progress flex-grow-1 me-2" style={{ height: '20px' }}>
                    <div 
                      className="progress-bar" 
                      role="progressbar"
                      style={{ width: `${cpu.percent || 0}%` }} 
                      aria-valuenow={cpu.percent || 0} 
                      aria-valuemin="0" 
                      aria-valuemax="100"
                    >
                      {cpu.percent || 0}%
                    </div>
                  </div>
                  <span>Cores: {cpu.count || 'N/A'}</span>
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
                    style={{ width: `${memory.percent_used || 0}%` }} 
                    aria-valuenow={memory.percent_used || 0} 
                    aria-valuemin="0" 
                    aria-valuemax="100"
                  >
                    {memory.percent_used || 0}%
                  </div>
                </div>
                <div className="small">
                  {Math.round((memory.used || 0) / (1024 * 1024))} MB used of {Math.round((memory.total || 1) / (1024 * 1024))} MB total
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
                    style={{ width: `${disk.percent_used || 0}%` }} 
                    aria-valuenow={disk.percent_used || 0} 
                    aria-valuemin="0" 
                    aria-valuemax="100"
                  >
                    {disk.percent_used || 0}%
                  </div>
                </div>
                <div className="small">
                  {Math.round((disk.used || 0) / (1024 * 1024 * 1024))} GB used of {Math.round((disk.total || 1) / (1024 * 1024 * 1024))} GB total
                </div>
              </td>
            </tr>
            <tr>
              <th>System Uptime</th>
              <td>{Math.floor((uptime.system || 0) / 60 / 60)} hours, {Math.floor(((uptime.system || 0) / 60) % 60)} minutes</td>
            </tr>
            <tr>
              <th>Process Uptime</th>
              <td>{Math.floor((uptime.process || 0) / 60)} minutes</td>
            </tr>
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
};

const ElasticsearchDiagnostics = ({ elasticsearch }) => {
  if (!elasticsearch) return <Alert variant="warning">No Elasticsearch information available</Alert>;
  
  // Create safe references to nested objects
  const connection = elasticsearch.connection || {};
  const ping = elasticsearch.ping || {};
  const query = elasticsearch.query || {};
  
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
            <strong>URL:</strong> {elasticsearch.elasticsearch_url || 'Not configured'}
          </p>
        </Alert>
        
        {ping && Object.keys(ping).length > 0 && (
          <div className="mt-4">
            <h5 className="border-bottom pb-2 mb-3">Network Ping</h5>
            <Table striped bordered>
              <tbody>
                <tr>
                  <th width="30%">Status</th>
                  <td>
                    <Badge bg={ping.success ? 'success' : 'danger'}>
                      {ping.success ? 'Success' : 'Failed'}
                    </Badge>
                  </td>
                </tr>
                <tr>
                  <th>Packets</th>
                  <td>{ping.packets_received || 0} received of {ping.packets_sent || 0} sent</td>
                </tr>
                <tr>
                  <th>Packet Loss</th>
                  <td>{ping.packet_loss_percent || 0}%</td>
                </tr>
                {ping.avg_latency_ms != null && (
                  <tr>
                    <th>Latency</th>
                    <td>
                      Min: {ping.min_latency_ms || 0}ms / 
                      Avg: {ping.avg_latency_ms || 0}ms / 
                      Max: {ping.max_latency_ms || 0}ms
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
        
        {connection && Object.keys(connection).length > 0 && (
          <div className="mt-4">
            <h5 className="border-bottom pb-2 mb-3">HTTP Connection</h5>
            <Table striped bordered>
              <tbody>
                <tr>
                  <th width="30%">Status</th>
                  <td>
                    <Badge bg={connection.success ? 'success' : 'danger'}>
                      {connection.success ? 'Success' : 'Failed'}
                    </Badge>
                  </td>
                </tr>
                <tr>
                  <th>Status Code</th>
                  <td>{connection.status_code || 'N/A'}</td>
                </tr>
                <tr>
                  <th>DNS Resolution</th>
                  <td>
                    <Badge bg={connection.dns_resolved ? 'success' : 'danger'}>
                      {connection.dns_resolved ? 'Success' : 'Failed'}
                    </Badge>
                    {connection.ip_address && ` (${connection.ip_address})`}
                  </td>
                </tr>
                <tr>
                  <th>Response Time</th>
                  <td>{connection.total_latency_ms != null ? connection.total_latency_ms.toFixed(2) : 'N/A'} ms</td>
                </tr>
                {connection.error && (
                  <tr>
                    <th>Error</th>
                    <td className="text-danger">{connection.error}</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
        
        {query && Object.keys(query).length > 0 && (
          <div className="mt-4">
            <h5 className="border-bottom pb-2 mb-3">Query Test</h5>
            <Table striped bordered>
              <tbody>
                <tr>
                  <th width="30%">Status</th>
                  <td>
                    <Badge bg={query.success ? 'success' : 'danger'}>
                      {query.success ? 'Success' : 'Failed'}
                    </Badge>
                  </td>
                </tr>
                {query.status_code != null && (
                  <tr>
                    <th>Status Code</th>
                    <td>{query.status_code}</td>
                  </tr>
                )}
                {query.hit_count != null && (
                  <tr>
                    <th>Documents Found</th>
                    <td>{query.hit_count}</td>
                  </tr>
                )}
                {query.sample_document_fields && query.sample_document_fields.length > 0 && (
                  <tr>
                    <th>Document Fields</th>
                    <td>
                      {query.sample_document_fields.map(field => (
                        <Badge key={field} bg="secondary" className="me-1 mb-1">{field}</Badge>
                      ))}
                    </td>
                  </tr>
                )}
                {query.error && (
                  <tr>
                    <th>Error</th>
                    <td className="text-danger">{query.error}</td>
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
  // Ensure errors is an array
  const safeErrors = Array.isArray(errors) ? errors : [];
  
  if (safeErrors.length === 0) {
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
        <h5 className="border-bottom pb-2 mb-3">Recent Backend Errors ({safeErrors.length})</h5>
        
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {safeErrors.map((error, index) => (
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
                      <div><strong>Type:</strong> {error.exception.type || 'Unknown'}</div>
                      <div><strong>Message:</strong> {error.exception.value || 'No message'}</div>
                      {error.exception.traceback && Array.isArray(error.exception.traceback) && (
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
            {Object.entries(tests).map(([target, results], index) => {
              // Create safe references to nested objects
              const ping = results?.ping || {};
              const http = results?.http || {};
              const traceroute = results?.traceroute || {};
              
              return (
                <Accordion.Item key={target} eventKey={index.toString()}>
                  <Accordion.Header>
                    <div className="d-flex align-items-center w-100">
                      <span className="me-auto">{target}</span>
                      {http && Object.keys(http).length > 0 && (
                        <Badge bg={http.success ? 'success' : 'danger'} className="me-2">
                          HTTP: {http.success ? 'Success' : 'Failed'}
                        </Badge>
                      )}
                      {ping && Object.keys(ping).length > 0 && (
                        <Badge bg={ping.success ? 'success' : 'danger'} className="me-2">
                          Ping: {ping.success ? 'Success' : 'Failed'}
                        </Badge>
                      )}
                    </div>
                  </Accordion.Header>
                  <Accordion.Body>
                    {ping && Object.keys(ping).length > 0 && (
                      <div className="mb-3">
                        <h6>Ping Results</h6>
                        <Table striped bordered size="sm">
                          <tbody>
                            <tr>
                              <th width="30%">Status</th>
                              <td>
                                <Badge bg={ping.success ? 'success' : 'danger'}>
                                  {ping.success ? 'Success' : 'Failed'}
                                </Badge>
                              </td>
                            </tr>
                            <tr>
                              <th>Packet Loss</th>
                              <td>{ping.packet_loss_percent || 0}%</td>
                            </tr>
                            {ping.avg_latency_ms != null && (
                              <tr>
                                <th>Average Latency</th>
                                <td>{ping.avg_latency_ms} ms</td>
                              </tr>
                            )}
                            {ping.error && (
                              <tr>
                                <th>Error</th>
                                <td className="text-danger">{ping.error}</td>
                              </tr>
                            )}
                          </tbody>
                        </Table>
                      </div>
                    )}
                    
                    {http && Object.keys(http).length > 0 && (
                      <div className="mb-3">
                        <h6>HTTP Connection</h6>
                        <Table striped bordered size="sm">
                          <tbody>
                            <tr>
                              <th width="30%">Status</th>
                              <td>
                                <Badge bg={http.success ? 'success' : 'danger'}>
                                  {http.success ? 'Success' : 'Failed'}
                                </Badge>
                              </td>
                            </tr>
                            <tr>
                              <th>Status Code</th>
                              <td>{http.status_code || 'N/A'}</td>
                            </tr>
                            <tr>
                              <th>Response Time</th>
                              <td>{http.total_latency_ms != null ? http.total_latency_ms.toFixed(2) : 'N/A'} ms</td>
                            </tr>
                            {http.error && (
                              <tr>
                                <th>Error</th>
                                <td className="text-danger">{http.error}</td>
                              </tr>
                            )}
                          </tbody>
                        </Table>
                      </div>
                    )}
                    
                    {traceroute && Object.keys(traceroute).length > 0 && (
                      <div>
                        <h6>Traceroute</h6>
                        <Table striped bordered size="sm">
                          <tbody>
                            <tr>
                              <th width="30%">Status</th>
                              <td>
                                <Badge bg={traceroute.success ? 'success' : 'danger'}>
                                  {traceroute.success ? 'Success' : 'Failed'}
                                </Badge>
                              </td>
                            </tr>
                            <tr>
                              <th>Destination Reached</th>
                              <td>
                                <Badge bg={traceroute.reached_destination ? 'success' : 'danger'}>
                                  {traceroute.reached_destination ? 'Yes' : 'No'}
                                </Badge>
                              </td>
                            </tr>
                            {traceroute.error && (
                              <tr>
                                <th>Error</th>
                                <td className="text-danger">{traceroute.error}</td>
                              </tr>
                            )}
                          </tbody>
                        </Table>
                      </div>
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              );
            })}
          </Accordion>
        )}
      </Card.Body>
    </Card>
  );
};

export default AdvancedDiagnostics; 