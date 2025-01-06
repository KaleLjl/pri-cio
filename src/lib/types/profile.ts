// 基础的 Profile 接口
export interface Profile {
  email?: string;
  firstName?: string;
  lastName?: string;
  about?: string;
  pronouns?: string;
  website?: string;
  username?: string;
  avatar?: string | null;
}

// Profile 表单数据接口
export interface ProfileFormData extends Profile {
  email: string;  // 在表单数据中 email 是必需的
}

// Profile 页面 Hook 的返回类型
export interface UseProfilePage {
  // 当前头像 URL
  avatar: string | null;
  
  // 表单数据
  formData: Profile;
  
  // 头像更改处理函数
  handleAvatarChange: (file: File) => Promise<void>;
  
  // 输入字段更改处理函数
  handleInputChange: (name: string, value: string) => void;
  
  // 重置表单函数
  resetForm: () => void;
  
  // 保存档案函数
  saveProfile: () => Promise<void>;
  
  // 获取档案数据函数
  fetchProfileData: () => Promise<{
    avatar: string | null;
    formData: Profile;
  }>;
}

// API 响应类型
export interface ProfileApiResponse {
  message: string;
  profile?: Profile;
  error?: string;
}

// 用于验证的类型
export type RequiredProfileFields = Pick<Profile, 'firstName' | 'lastName' | 'username'>;