const axios = require('axios');

const INVENTORY_SERVER_URL =
  process.env.INVENTORY_SERVER_URL || 'http://localhost:3004';

const inventoryService = {
  async consumeSeed({ userId, itemTypeId }) {
    const response = await axios.post(
      `${INVENTORY_SERVER_URL}/api/v1/inventory/consume-seed`,
      {
        itemTypeId,
      },
      {
        headers: {
          'x-user-id': userId,
        },
      }
    );

    return response.data;
  },

  async rewardItem({ userId, itemTypeId, qty }) {
    const response = await axios.post(
      `${INVENTORY_SERVER_URL}/api/v1/inventory/reward`,
      {
        itemTypeId,
        qty,
      },
      {
        headers: {
          'x-user-id': userId,
        },
      }
    );

    return response.data;
  },
};

module.exports = inventoryService;