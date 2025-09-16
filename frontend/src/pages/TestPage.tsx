import React from 'react';

export const TestPage: React.FC = () => {
  return (
    <div style={{padding: '20px', background: 'white', color: 'black'}}>
      <h1>Test Page is Working!</h1>
      <p>If you can see this, React is rendering correctly.</p>
      <p>Current time: {new Date().toLocaleString()}</p>
    </div>
  );
};

export default TestPage;