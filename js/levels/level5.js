// GlucoDefense — Level 5: "Living With Diabetes"

import { food } from './foodData.js';

export const level5 = {
  id: 5,
  name: 'Living With Diabetes',
  description: 'Significant degradation. Use all tools wisely.',
  mineCount: 15,

  interventions: {
    exercise: true,
    semaglutide: { charges: 2 },
    dapagliflozin: { charges: 2 },
    metformin: { charges: 2 },
  },

  waves: [
    {
      time: '07:30',
      choices: [
        { foods: [food('eggs'), food('veggies')] },
        { foods: [food('oatmeal'), food('apple')] },
        { foods: [food('cereal'), food('banana')] },
        { foods: [food('cookie'), food('cola')] },
      ],
    },
    {
      time: '10:00',
      choices: [
        { foods: [food('cheese'), food('broccoli')] },
        { foods: [food('yogurt'), food('banana')] },
        { foods: [food('sandwich'), food('milk')] },
        { foods: [food('chocolate'), food('cola')] },
      ],
    },
    {
      time: '13:00',
      choices: [
        { foods: [food('fish'), food('salad'), food('stew')] },
        { foods: [food('rice'), food('chicken')] },
        { foods: [food('pasta'), food('yogurt')] },
        { foods: [food('burger'), food('fries')] },
      ],
    },
    {
      time: '17:00',
      choices: [
        { foods: [food('turkey'), food('veggies')] },
        { foods: [food('chicken'), food('salad')] },
        { foods: [food('sandwich'), food('banana')] },
        { foods: [food('fries'), food('cola')] },
      ],
    },
    {
      time: '20:00',
      choices: [
        { foods: [food('fish'), food('salad'), food('cheese')] },
        { foods: [food('stew'), food('bread')] },
        { foods: [food('pasta'), food('banana')] },
        { foods: [food('pizza'), food('iceCream')] },
      ],
    },
  ],
};
