// GlucoDefense — Level 3: "Birthday Party"

import { food } from './foodData.js';

export const level3 = {
  id: 3,
  name: 'Birthday Party',
  description: 'Survive the temptations of a birthday celebration.',
  mineCount: 25,

  interventions: {
    exercise: true,
    semaglutide: { charges: 1 },
    dapagliflozin: { charges: 0 },
    metformin: { charges: 0 },
  },

  waves: [
    {
      time: '08:00',
      choices: [
        { foods: [food('eggs'), food('veggies')] },
        { foods: [food('oatmeal')] },
        { foods: [food('bread'), food('yogurt')] },
        { foods: [food('muffin'), food('chocolate')] },
      ],
    },
    {
      time: '12:00',
      choices: [
        { foods: [food('fish'), food('salad')] },
        { foods: [food('sandwich'), food('banana')] },
        { foods: [food('pasta')] },
        { foods: [food('pizza'), food('chips')] },
      ],
    },
    {
      time: '15:00',
      choices: [
        { foods: [food('cheese'), food('broccoli')] },
        { foods: [food('apple'), food('yogurt')] },
        { foods: [food('banana'), food('bread')] },
        { foods: [food('iceCream'), food('cookie')] },
      ],
    },
    {
      time: '19:00',
      choices: [
        { foods: [food('chicken'), food('veggies')] },
        { foods: [food('stew'), food('bread')] },
        { foods: [food('pasta'), food('banana')] },
        { foods: [food('burger'), food('cola')] },
      ],
    },
  ],
};
