'use client';

import React, { useState, useEffect } from "react";
import {
  Container,
  TextField,
  Button,
  Avatar,
  Typography,
  Box,
} from "@mui/material";
import { useProfilePage } from "@/lib/hooks/useProfilePage";
import { useSession } from 'next-auth/react'; // Import useSession to get user data
import { useLanguage } from '@/lib/context/LanguageContext';
import ImageWithFallback from '@/components/shared/ImageWithFallback';

const ProfilePage = () => {
  const { dict } = useLanguage();
  // 获取用户会话数据
  const { data: session } = useSession();
  const userId = session?.user?.id || "";
  const userEmail = session?.user?.email || "";
  const emailInitial = userEmail.charAt(0).toUpperCase(); // 获取邮箱首字母作为头像默认显示

  // 使用自定义 Hook 获取配置文件相关功能
  const {
    avatarUrl,
    formData,
    handleAvatarChange,
    handleInputChange,
    resetForm,
    saveProfile,
    fetchProfileData,
  } = useProfilePage(userId);

  // 状态管理
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null); // 预览头像
  const [isLoading, setIsLoading] = useState(true); // 加载状态

  // 在组件加载时获取用户资料数据
  useEffect(() => {
    const loadProfile = async () => {
      try {
        await fetchProfileData();
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [fetchProfileData]);

  // 更新文件上传处理
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 创建临时预览
      const objectUrl = URL.createObjectURL(file);
      setPreviewAvatar(objectUrl);
      
      // 处理文件上传
      await handleAvatarChange(file);
    }
  };

  // 清理预览 URL
  useEffect(() => {
    return () => {
      if (previewAvatar) {
        URL.revokeObjectURL(previewAvatar);
      }
    };
  }, [previewAvatar]);

  // 显示的头像：优先显示预览头像，其次是当前头像URL
  const displayedAvatar = previewAvatar || formData.avatarUrl;

  // 加载状态显示
  if (isLoading) {
    return <div className="text-center py-10">{dict.editProfile.loading}</div>;
  }

  return (
    <div style={{ backgroundColor: "black", minHeight: "100vh", color: "white" }}>
      {/* 导航栏占位符 */}
      <Box sx={{ height: "64px", backgroundColor: "black" }} />
  
      <Container maxWidth="sm" sx={{ py: 6 }}>
        {/* 页面标题 */}
        <Typography
          variant="h4"
          sx={{
            fontFamily: "Arial, Helvetica, sans-serif",
            fontWeight: "bold",
            fontSize: "24px",
            lineHeight: "1.5",
            textAlign: "center",
            color: "white",
          }}
        >
          {dict.editProfile.title}
        </Typography>

        {/* 页面说明文字 */}
        <Typography
          variant="body1"
          sx={{
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: "16px",
            lineHeight: "1.5",
            textAlign: "center",
            color: "gray",
            mt: 2,
          }}
        >
          {dict.editProfile.subtitle}
        </Typography>
  
        {/* 头像上传区域 */}
        <Box display="flex" alignItems="center" justifyContent="center" my={4}>
          <div className="relative w-20 h-20 rounded-full overflow-hidden">
            <ImageWithFallback
              src={displayedAvatar || ''}
              alt={formData.name || emailInitial}
              layout="fill"
              objectFit="cover"
              isAvatar={true}
            />
          </div>
          <Button
            variant="contained"
            component="label"
            sx={{
              ml: 2,
              backgroundColor: "white",
              color: "black",
              textTransform: "none",
              "&:hover": { backgroundColor: "gray" },
            }}
          >
            {dict.editProfile.avatar.change}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileUpload}
            />
          </Button>
        </Box>
  
        {/* 表单输入区域 */}
        <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <TextField
            label={dict.editProfile.form.name.label}
            name="name"
            value={formData.name}
            onChange={(e) => handleInputChange(e.target.name, e.target.value)}
            fullWidth
            variant="outlined"
            sx={{
              backgroundColor: "black",
              "& .MuiOutlinedInput-root": {
                color: "white",
                "& fieldset": {
                  borderColor: "white",
                },
                "&:hover fieldset": {
                  borderColor: "#6D28D9",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#6D28D9",
                },
              },
              "& .MuiInputLabel-root": {
                color: "white",
                "&.Mui-focused": {
                  color: "#6D28D9",
                },
              },
            }}
          />
          <TextField
            label={dict.editProfile.form.about.label}
            name="about"
            value={formData.about}
            onChange={(e) => handleInputChange(e.target.name, e.target.value)}
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            sx={{
              backgroundColor: "black",
              "& .MuiOutlinedInput-root": {
                color: "white",
                "& fieldset": {
                  borderColor: "white",
                },
                "&:hover fieldset": {
                  borderColor: "#6D28D9", // Purple-600
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#6D28D9", // Purple-600
                },
              },
              "& .MuiInputLabel-root": {
                color: "white",
                "&.Mui-focused": {
                  color: "#6D28D9", // Purple-600
                },
              },
            }}
          />
          <TextField
            label={dict.editProfile.form.website.label}
            name="website"
            value={formData.website}
            onChange={(e) => handleInputChange(e.target.name, e.target.value)}
            fullWidth
            variant="outlined"
            sx={{
              backgroundColor: "black",
              "& .MuiOutlinedInput-root": {
                color: "white",
                "& fieldset": {
                  borderColor: "white",
                },
                "&:hover fieldset": {
                  borderColor: "#6D28D9", // Purple-600
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#6D28D9", // Purple-600
                },
              },
              "& .MuiInputLabel-root": {
                color: "white",
                "&.Mui-focused": {
                  color: "#6D28D9", // Purple-600
                },
              },
            }}
          />
        </Box>
  
        {/* 底部按钮区域 */}
        <Box display="flex" justifyContent="space-between" mt={4}>
          {/* 重置按钮 */}
          <Button
            variant="outlined"
            sx={{
              borderRadius: "20px",
              color: "white",
              borderColor: "white",
              "&:hover": { backgroundColor: "gray", borderColor: "#6D28D9" },
            }}
            onClick={resetForm}
          >
            {dict.editProfile.actions.reset}
          </Button>
          
          {/* 保存按钮 */}
          <Button
            variant="contained"
            sx={{
              borderRadius: "20px",
              backgroundColor: "#6D28D9",
              "&:hover": { backgroundColor: "#9333ea" }, // Darker Purple
            }}
            onClick={saveProfile}
          >
            {dict.editProfile.actions.save}
          </Button>
        </Box>
      </Container>
    </div>
  );
};

export default ProfilePage;
