import * as React from "react";
import { useState, useEffect } from "react";
import { Input } from "antd";
import "@fontsource/tajawal";
import "@fortawesome/fontawesome-free/css/all.min.css";

import logo from "../../assets/img/Logo.png";
import logoname from "../../assets/img/LogoName.png";

import { spfi, SPFx } from "@pnp/sp/presets/all";
import "@pnp/sp/webs";
import { IDmswebasprProps } from "../IDmswebasprProps";

export const TopNavigation: React.FC<IDmswebasprProps> = (props) => {
  // ✅ Navigation owns language
  const [isArabic, setIsArabic] = useState<boolean>(
    localStorage.getItem("isArabic") === "ar"
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [userName, setUserName] = useState("User");
  const [userPhotoUrl, setUserPhotoUrl] = useState("");

  const sp = props.context
    ? spfi().using(SPFx(props.context))
    : null;

  useEffect(() => {
    const savedLang = localStorage.getItem("isArabic");

    // 🔹 Force Arabic on first load
    if (!savedLang) {
      localStorage.setItem("isArabic", "ar");

      // 🔥 notify all pages
      window.dispatchEvent(new Event("languageChanged"));
    }
  }, []);

  useEffect(() => {
    if (!sp) return;

    const loadUserProfile = async () => {
      try {
        const user = await sp.web.currentUser();
        setUserName(user.Title);
        setUserPhotoUrl(
          `${window.location.origin}/_layouts/15/userphoto.aspx?size=L&username=${user.Email}`
        );
      } catch (err) {
        console.error("Error fetching user details:", err);
      }
    };

    loadUserProfile();
  }, [sp]);
  const handleTranslateClick = () => {
    const next = !isArabic;
    setIsArabic(next);
    localStorage.setItem("isArabic", next ? "ar" : "en");
    window.dispatchEvent(new Event("languageChanged"));
  };

  return (
    <div className="Navbarstrip" dir={isArabic ? "rtl" : "ltr"}>
      <div className={isArabic ? "erp-Headingstrip" : "Headingstrip"} >
        {/* Left - Logo */}
        <div className={isArabic ? "erp-mainlogo" : "mainlogo"}>
          <img src={logo} className={isArabic ? "erp-logo" : "logo"} />
          <img src={logoname} alt="" className={isArabic ? "erp-logoname" : "logoname"} />
        </div>

        {/* Center - Heading */}
        <h1 className={isArabic ? "erp-heading" : "heading"}> {isArabic ? "لوحة معلومات نظام إدارة المستندات" : "Document Management System Dashboard"} </h1>

        {/* Right - User Profile */}
        <div className={isArabic ? "erp-userProfile" : "userProfile"}>
          {userPhotoUrl && <img src={userPhotoUrl} alt="User Profile" />}
          <div>
            <span>{userName}</span>
          </div>
        </div>
      </div>

      <div className="Headline"></div>

      <div className={isArabic ? "erp-topbannerbox" : "topbannerbox"}>
        <div className="navmainsection">
          <div className={isArabic ? "erp-lang-toggle" : "lang-toggle"}>
            <button
              className={`lang-btn ${!isArabic ? "active" : ""}`}
              onClick={handleTranslateClick}
            >
              <i className="fas fa-globe-americas icon"></i> ENG
            </button>

            <button
              className={`lang-btn ${isArabic ? "active" : ""}`}
              onClick={handleTranslateClick}
            >
              <i className="fas fa-globe-asia icon"></i> العربية
            </button>
          </div>
        </div>

        <div className="LibSearch">
          <Input.Search
            placeholder={isArabic ? "ابحث عن مكتبة" : "Find a Library"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
        </div>
      </div>

      <div className="Headlinetwo"></div>
    </div>
  );
};
