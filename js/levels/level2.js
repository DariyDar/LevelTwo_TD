// GlucoDefense — Level 2: "Office Lunch"

import { food } from './foodData.js';

export const level2 = {
  id: 2,
  name: 'Office Lunch',
  description: 'Navigate temptation at work.',
  mineCount: 10,

  interventions: {
    exercise: false,
    semaglutide: { charges: 1 },
    dapagliflozin: { charges: 0 },
    metformin: { charges: 0 },
  },

  waves: [
    {
      time: '08:00',
      choices: [
        { foods: [food('eggs'), food('broccoli')] },
        { foods: [food('oatmeal')] },
        { foods: [food('cereal'), food('banana')] },
        { foods: [food('donut'), food('cola')] },
      ],
    },
    {
      time: '12:30',
      choices: [
        { foods: [food('chicken'), food('stew')] },
        { foods: [food('sandwich'), food('apple')] },
        { foods: [food('rice'), food('banana')] },
        { foods: [food('burger'), food('fries')] },
      ],
    },
    {
      time: '19:00',
      choices: [
        { foods: [food('fish'), food('salad')] },
        { foods: [food('stew'), food('bread')] },
        { foods: [food('pasta')] },
        { foods: [food('pizza'), food('cola')] },
      ],
    },
  ],
};
