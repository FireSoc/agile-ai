import { api } from './client';
import type {
  SimulationRequest,
  SimulationResponse,
  SimulationCompareRequest,
  SimulationCompareResponse,
  SimulationAssumptions,
} from '../types';

export const simulationsApi = {
  run: (payload: SimulationRequest) =>
    api.post<SimulationResponse>('/simulations/risk', payload),

  runFromProject: (projectId: number, assumptions?: SimulationAssumptions) =>
    api.post<SimulationResponse>(
      `/simulations/risk/from-project/${projectId}`,
      assumptions ?? {},
    ),

  compare: (payload: SimulationCompareRequest) =>
    api.post<SimulationCompareResponse>('/simulations/risk/compare', payload),
};
