import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import user from '@testing-library/user-event';
import '@testing-library/jest-dom/extend-expect'; // needed this to extend the jest-dom assertions  (ex toHaveTextContent)
import Action from '../components/Action';
import { changeView, changeSlider } from '../actions/actions';

// @ts-ignore
Action.cleanTime = jest.fn().mockReturnValue();

describe('unit testing for Action.tsx', () => {
  const props = {
    key: 'actions2',
    selected: true,
    last: false,
    index: 2,
    sliderIndex: 2,
    isCurrIndex: false,
    routePath: '',
    dispatch: jest.fn(),
    displayName: '3.0',
    componentName: 'App',
    logChangedState: jest.fn(),
    componentData: {
      actualDuration: 3.5,
    },
    state: { test: 'test' },
    viewIndex: 2,
    handleOnkeyDown: jest.fn(),
  };

  beforeEach(() => {
    props.isCurrIndex = false;
    props.componentData = { actualDuration: 3.5 };
    props.dispatch.mockClear();
  });

  describe('When a component is shown on the page', () => {
    test('Action snapshot should be shown as Snapshot: 3.0', () => {
      render(<Action {...props} />);
      expect(screen.getByPlaceholderText('Snapshot: 3.0')).toBeInTheDocument();
    });

    test('two buttons with time and Current when not at current snapshot', () => {
      props.isCurrIndex = true;
      render(<Action {...props} />);
      expect(screen.getAllByRole('button')).toHaveLength(2);
      expect(screen.getAllByRole('button')[0]).toHaveTextContent('+00:03.50');
      expect(screen.getAllByRole('button')[1]).toHaveTextContent('Current');
    });

    test('Action snapshot should be shown as Snapshot: 3.0', () => {
      render(<Action {...props} />);
      expect(screen.getByPlaceholderText('Snapshot: 3.0')).toBeInTheDocument();
    });

    test("when there's no duration data", () => {
      props.componentData = undefined;
      render(<Action {...props} />);
      expect(screen.getAllByRole('button')[0]).toHaveTextContent('NO TIME');
    });

    test('When actualDuration exceeds 60, time should be formatted correctly', () => {
      props.componentData.actualDuration = 75; 
      render(<Action {...props} />);
      expect(screen.getAllByRole('button')[0]).toHaveTextContent('+01:15.00');
    });

    test('Using the ArrowUp key on Action snapshot should trigger handleOnKeyDown', () => {
      render(<Action {...props} />);
      fireEvent.keyDown(screen.getByRole('presentation'), {key: 'ArrowUp', code: 'ArrowUp', charCode: 38});
      expect(props.handleOnkeyDown).toHaveBeenCalled();
    });

    test('Using the ArrowDown key on Action snapshot should trigger handleOnKeyDown', () => {
      render(<Action {...props} />);
      fireEvent.keyDown(screen.getByRole('presentation'), {key: 'ArrowDown', code: 'ArrowDown', charCode: 40});
      expect(props.handleOnkeyDown).toHaveBeenCalled();
    });

    test('Using the Enter key on Action snapshot should trigger handleOnKeyDown', () => {
      render(<Action {...props} />);
      fireEvent.keyDown(screen.getByRole('presentation'), {key: 'Enter', code: 'Enter', charCode: 13});
      expect(props.handleOnkeyDown).toHaveBeenCalled();
    });

    test('Clicking the snapshot should trigger onClick', () => {
      render(<Action {...props} />);
      fireEvent.click(screen.getByRole('presentation'));
      expect(props.dispatch).toHaveBeenCalledWith(changeView(props.index));;
    });

    test('Clicking Jump button should trigger changeSlider and changeView', () => {
      render(<Action {...props} />);
      fireEvent.click(screen.getAllByRole('button')[1]);
      expect(props.dispatch).toHaveBeenCalledWith(changeSlider(props.index));
      expect(props.dispatch).toHaveBeenCalledWith(changeView(props.index));
    });
  });
});
