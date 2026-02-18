// GlucoDefense — Level 1: "First Day" (tutorial)

import { food } from './foodData.js';

export const level1 = {
  id: 1,
  name: 'First Day',
  description: 'Learn the basics of glucose metabolism.',
  mineCount: 10,

  interventions: {
    exercise: false,
    semaglutide: { charges: 0 },
    dapagliflozin: { charges: 0 },
    metformin: { charges: 0 },
  },

  waves: [
    {
      time: '08:00',
      choices: [
        { foods: [food('eggs'), food('bread')] },
        { foods: [food('oatmeal'), food('banana')] },
        { foods: [food('cereal'), food('banana')] },
        { foods: [food('muffin'), food('cola')] },
      ],
    },
    {
      time: '13:00',
      choices: [
        { foods: [food('chicken'), food('rice')] },
        { foods: [food('sandwich'), food('apple')] },
        { foods: [food('stew'), food('bread')] },
        { foods: [food('burger'), food('cola')] },
      ],
    },
    {
      time: '16:00',
      choices: [
        { foods: [food('apple'), food('cheese')] },
        { foods: [food('yogurt'), food('banana')] },
        { foods: [food('cookie')] },
        { foods: [food('chocolate')] },
      ],
    },
    {
      time: '19:00',
      choices: [
        { foods: [food('fish'), food('rice')] },
        { foods: [food('stew'), food('bread')] },
        { foods: [food('pasta'), food('salad')] },
        { foods: [food('pizza'), food('cola')] },
      ],
    },
  ],
};
