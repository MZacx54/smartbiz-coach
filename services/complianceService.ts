import api from './api';

export interface ComplianceStatus {
  name_search_completed: boolean;
  business_reg_completed: boolean;
  tin_obtained_completed: boolean;
  bank_account_completed: boolean;
  updated_at?: string;
}

export interface AgentHirePayload {
  business_name: string;
  business_type: string;
  phone_number: string;
}

export const getComplianceStatus = async (): Promise<ComplianceStatus> => {
  const response = await api.get('users/compliance/');
  return response.data;
};

export const updateComplianceStatus = async (
  updates: Partial<ComplianceStatus>
): Promise<ComplianceStatus> => {
  const response = await api.patch('users/compliance/', updates);
  return response.data;
};

export const submitHireRequest = async (
  payload: AgentHirePayload
): Promise<{ message: string; id: number }> => {
  const response = await api.post('users/hire-agent/', payload);
  return response.data;
};
