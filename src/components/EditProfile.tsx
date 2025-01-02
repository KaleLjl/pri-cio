'use client';

import React, { useState } from "react";
import {
    Container,
    TextField,
    Button,
    Avatar,
    Typography,
    Box,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    SelectChangeEvent,
  } from "@mui/material";

const ProfilePage = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    about: "",
    pronouns: "",
    website: "",
    username: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = () => {
    alert("Profile saved successfully!");
    console.log("Profile Data:", formData);
  };

  const handleReset = () => {
    setFormData({
      firstName: "",
      lastName: "",
      about: "",
      pronouns: "",
      website: "",
      username: "",
    });
  };

  return (
    <div style={{ backgroundColor: "black", minHeight: "100vh", color: "white" }}>
      {/* Spacer for Navigation */}
      <Box sx={{ height: "64px", backgroundColor: "black" }} />

      <Container maxWidth="sm" sx={{ py: 6 }}>
        {/* Page Header */}
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
          Edit Profile
        </Typography>
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
          Keep your personal details private. Information you add here is visible to anyone who can view your profile.
        </Typography>

        {/* Profile Picture and Change Button */}
        <Box display="flex" alignItems="center" justifyContent="center" my={4}>
          <Avatar
            sx={{
              bgcolor: "gray",
              width: 80,
              height: 80,
            }}
          >
            C
          </Avatar>
          <Button
            variant="contained"
            sx={{
              ml: 2,
              backgroundColor: "white",
              color: "black",
              textTransform: "none",
              "&:hover": { backgroundColor: "gray" },
            }}
          >
            Change
          </Button>
        </Box>

        {/* Input Fields */}
        <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <TextField
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
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
                  borderColor: "#a855f7", // Purple-500
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#a855f7", // Purple-500
                },
              },
              "& .MuiInputLabel-root": {
                color: "white",
                "&.Mui-focused": {
                  color: "#a855f7", // Purple-500
                },
              },
            }}
          />
          <TextField
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
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
                  borderColor: "#a855f7", // Purple-500
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#a855f7", // Purple-500
                },
              },
              "& .MuiInputLabel-root": {
                color: "white",
                "&.Mui-focused": {
                  color: "#a855f7", // Purple-500
                },
              },
            }}
          />
          <TextField
            label="About"
            name="about"
            value={formData.about}
            onChange={handleInputChange}
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
                  borderColor: "#a855f7", // Purple-500
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#a855f7", // Purple-500
                },
              },
              "& .MuiInputLabel-root": {
                color: "white",
                "&.Mui-focused": {
                  color: "#a855f7", // Purple-500
                },
              },
            }}
          />
          <FormControl fullWidth sx={{ backgroundColor: "black" }}>
            <InputLabel sx={{ color: "white", "&.Mui-focused": { color: "#a855f7" } }}>
              Pronouns
            </InputLabel>
            <Select
              label="Pronouns"
              name="pronouns"
              value={formData.pronouns}
              onChange={handleInputChange}
              sx={{
                color: "white",
                "& fieldset": {
                  borderColor: "white",
                },
                "&:hover fieldset": {
                  borderColor: "#a855f7", // Purple-500
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#a855f7", // Purple-500
                },
              }}
            >
              <MenuItem value="">Select your pronouns</MenuItem>
              <MenuItem value="he/him">He/Him</MenuItem>
              <MenuItem value="she/her">She/Her</MenuItem>
              <MenuItem value="they/them">They/Them</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Website"
            name="website"
            value={formData.website}
            onChange={handleInputChange}
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
                  borderColor: "#a855f7", // Purple-500
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#a855f7", // Purple-500
                },
              },
              "& .MuiInputLabel-root": {
                color: "white",
                "&.Mui-focused": {
                  color: "#a855f7", // Purple-500
                },
              },
            }}
          />
          <TextField
            label="Username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
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
                  borderColor: "#a855f7", // Purple-500
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#a855f7", // Purple-500
                },
              },
              "& .MuiInputLabel-root": {
                color: "white",
                "&.Mui-focused": {
                  color: "#a855f7", // Purple-500
                },
              },
            }}
          />
        </Box>

        {/* Reset and Save Buttons */}
        <Box display="flex" justifyContent="space-between" mt={4}>
          <Button
            variant="outlined"
            sx={{
              borderRadius: "20px",
              color: "white",
              borderColor: "white",
              "&:hover": { backgroundColor: "gray", borderColor: "#a855f7" },
            }}
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            sx={{
              borderRadius: "20px",
              backgroundColor: "#a855f7",
              "&:hover": { backgroundColor: "#9333ea" }, // Darker Purple
            }}
            onClick={handleSave}
          >
            Save
          </Button>
        </Box>
      </Container>
    </div>
  );
};

export default ProfilePage;