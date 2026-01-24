import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MealRating from '@/components/MealRating';

describe('MealRating Component', () => {
  const mockOnRate = jest.fn(() => Promise.resolve());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render like and dislike buttons', () => {
    render(
      <MealRating mealId="test-id" currentRating={null} onRate={mockOnRate} />
    );

    expect(screen.getByTitle('I liked this')).toBeInTheDocument();
    expect(screen.getByTitle("I didn't like this")).toBeInTheDocument();
  });

  it('should call onRate with "liked" when like button clicked', async () => {
    render(
      <MealRating mealId="test-id" currentRating={null} onRate={mockOnRate} />
    );

    fireEvent.click(screen.getByTitle('I liked this'));

    await waitFor(() => {
      expect(mockOnRate).toHaveBeenCalledWith('test-id', 'liked');
    });
  });

  it('should call onRate with "disliked" when dislike button clicked', async () => {
    render(
      <MealRating mealId="test-id" currentRating={null} onRate={mockOnRate} />
    );

    fireEvent.click(screen.getByTitle("I didn't like this"));

    await waitFor(() => {
      expect(mockOnRate).toHaveBeenCalledWith('test-id', 'disliked');
    });
  });

  it('should show visual feedback for current rating', () => {
    const { rerender } = render(
      <MealRating mealId="test-id" currentRating="liked" onRate={mockOnRate} />
    );

    // Check that the liked button has active styling (green background)
    const likeButton = screen.getByTitle('I liked this');
    expect(likeButton.className).toContain('bg-green');

    // Rerender with disliked rating
    rerender(
      <MealRating mealId="test-id" currentRating="disliked" onRate={mockOnRate} />
    );

    const dislikeButton = screen.getByTitle("I didn't like this");
    expect(dislikeButton.className).toContain('bg-red');
  });

  it('should display "Rate:" label', () => {
    render(
      <MealRating mealId="test-id" currentRating={null} onRate={mockOnRate} />
    );

    expect(screen.getByText('Rate:')).toBeInTheDocument();
  });
});
