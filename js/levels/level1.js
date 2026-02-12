// GlucoDefense — Level 1: "First Day" (tutorial)

import { food } from './foodData.js';

export const level1 = {
  id: 1,
  name: 'First Day',
  description: 'Learn the basics of glucose metabolism.',
  mineCount: 30,

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
        { foods: [food('eggs'), food('salad')] },
        { foods: [food('oatmeal')] },
        { foods: [food('cereal'), food('banana')] },
        { foods: [food('muffin'), food('cola')] },
      ],
    },
    {
      time: '13:00',
      choices: [
        { foods: [food('chicken'), food('salad')] },
        { foods: [food('sandwich'), food('apple')] },
        { foods: [food('rice'), food('banana')] },
        { foods: [food('burger'), food('cola')] },
      ],
    },
    {
      time: '19:00',
      choices: [
        { foods: [food('fish'), food('veggies')] },
        { foods: [food('stew'), food('bread')] },
        { foods: [food('pasta')] },
        { foods: [food('pizza'), food('cola')] },
      ],
    },
  ],
};
