/**
 * RATING SERVICE
 * Generate rating summary using index (for seeding / demo data)
 * @param {number} i
 */
exports.generateRatingByIndex = (i = 0) => {
  const average = Number((4.4 - i * 0.05).toFixed(1))

  const totalRatings = Math.max(0, 860 - i * 80)
  const totalReviews = Math.max(0, 210 - i * 20)

  const breakdown = {
    fiveStar: Math.max(0, 480 - i * 40),
    fourStar: Math.max(0, 240 - i * 30),
    threeStar: Math.max(0, 90 - i * 10),
    twoStar: Math.max(0, 30 - i * 5),
    oneStar: Math.max(0, 20 - i * 5)
  }

  return {
    averageRating: average,
    totalRatings,
    totalReviews,
    ...breakdown
  }
}

/**
 * Calculate rating summary from reviews (REAL DATA)
 * @param {Array} reviews
 */
exports.calculateRatingFromReviews = (reviews = []) => {
  if (!reviews.length) {
    return {
      averageRating: 0,
      totalRatings: 0,
      totalReviews: 0,
      fiveStar: 0,
      fourStar: 0,
      threeStar: 0,
      twoStar: 0,
      oneStar: 0
    }
  }

  let sum = 0
  const breakdown = {
    fiveStar: 0,
    fourStar: 0,
    threeStar: 0,
    twoStar: 0,
    oneStar: 0
  }

  for (const review of reviews) {
    sum += review.rating

    switch (review.rating) {
      case 5: breakdown.fiveStar++; break
      case 4: breakdown.fourStar++; break
      case 3: breakdown.threeStar++; break
      case 2: breakdown.twoStar++; break
      case 1: breakdown.oneStar++; break
    }
  }

  const totalRatings = reviews.length
  const averageRating = Number((sum / totalRatings).toFixed(1))

  return {
    averageRating,
    totalRatings,
    totalReviews: totalRatings,
    ...breakdown
  }
}
