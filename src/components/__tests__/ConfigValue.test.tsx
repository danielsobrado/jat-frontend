import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RenderResult } from '@testing-library/react';
import ConfigValue from '../ConfigValue';

describe('ConfigValue', () => {
  let renderResult: RenderResult;

  const renderComponent = (props: { configKey: string; value: any; className?: string }) => {
    renderResult = render(<ConfigValue {...props} />);
    return renderResult;
  };

  it('renders "Not set" for null or undefined values', () => {
    const { getByText } = renderComponent({ configKey: 'test', value: null });
    expect(getByText('Not set')).toBeInTheDocument();

    renderResult.rerender(<ConfigValue configKey="test" value={undefined} />);
    expect(getByText('Not set')).toBeInTheDocument();
  });

  it('masks sensitive values', () => {
    const { getByText } = renderComponent({ configKey: 'password', value: 'secret' });
    expect(getByText('********')).toBeInTheDocument();

    renderResult.rerender(<ConfigValue configKey="apiKey" value="secret" />);
    expect(getByText('********')).toBeInTheDocument();
  });

  it('renders boolean values with correct styling', () => {
    const { container: trueContainer } = renderComponent({ configKey: 'enabled', value: true });
    const { container: falseContainer } = render(<ConfigValue configKey="enabled" value={false} />);

    const trueElement = trueContainer.firstElementChild;
    const falseElement = falseContainer.firstElementChild;

    expect(trueElement).toHaveClass('bg-green-100', 'text-green-800');
    expect(falseElement).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('handles complex objects', () => {
    const { getByText } = renderComponent({ configKey: 'config', value: { test: true } });
    expect(getByText('Complex object')).toBeInTheDocument();
  });

  it('displays array length', () => {
    const { getByText } = renderComponent({ configKey: 'items', value: [1, 2, 3] });
    expect(getByText('Array[3]')).toBeInTheDocument();
  });

  it('renders string values', () => {
    const { getByText } = renderComponent({ configKey: 'name', value: 'test-value' });
    expect(getByText('test-value')).toBeInTheDocument();
  });

  it('applies custom className prop', () => {
    const { container } = renderComponent({
      configKey: 'test',
      value: 'value',
      className: 'custom-class'
    });
    expect(container.firstElementChild).toHaveClass('custom-class');
  });
});