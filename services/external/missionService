const axios = require('axios');

const MISSION_SERVER_URL =
  process.env.MISSION_SERVER_URL || 'http://localhost:3003';

const missionService = {
  async checkMissionCompleted({ userId, missionExecutionId }) {
    try {
      const response = await axios.get(
        `${MISSION_SERVER_URL}/api/internal/v1/missions/executions/${missionExecutionId}/status`,
        {
          headers: {
            'x-user-id': userId,
          },
        }
      );

      return response.data?.data || response.data;
    } catch (error) {
      console.error(
        `[External Error] missionService.checkMissionCompleted 실패: ${error.message}`
      );
      throw error;
    }
  },
};

module.exports = missionService;