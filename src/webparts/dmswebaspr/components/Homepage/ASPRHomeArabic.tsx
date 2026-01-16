import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import type { IDmswebasprProps } from "../IDmswebasprProps";
import { Modal } from '@fluentui/react';
import LibraryOps from "../../services/bal/Library";
import { ILibrary } from "../../services/interface/ILibrary";
import BannerOps from "../../services/bal/banner";
import { IBanner } from "../../services/interface/IBanner";

import { PeoplePicker, PrincipalType, IPeoplePickerContext } from "@pnp/spfx-controls-react/lib/PeoplePicker";

import { spfi, SPFx } from "@pnp/sp/presets/all";
import "@pnp/sp/folders";
import "@pnp/sp/files";
import "@pnp/sp/webs";

import Slider from 'react-slick';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";


import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Table, Tooltip, Button, message, Input } from "antd";

// font family 

import "@fontsource/tajawal";       // Regular 400
import "@fontsource/tajawal/500.css"; // Medium (optional)
import "@fontsource/tajawal/700.css"; // Bold (optional)

import "@fortawesome/fontawesome-free/css/all.min.css";

// -----------------------------------
import {
    DetailsList,
    DetailsListLayoutMode,
    SelectionMode,
    IColumn,
    ShimmeredDetailsList
} from "@fluentui/react";

import {
    FileOutlined, FilePdfOutlined, FileWordOutlined, FileExcelOutlined,
    FilePptOutlined, FileImageOutlined, FileZipOutlined, FileTextOutlined,
    FileMarkdownOutlined, CodeOutlined, FolderOutlined, DownloadOutlined, DeleteOutlined
} from "@ant-design/icons";


// Images import

import logo from "../../assets/img/Logo.png";
import logoname from "../../assets/img/LogoName.png";
import rightblack from "../../assets/img/Right.png";
import leftblack from "../../assets/img/Left.png";
import link from "../../assets/img/link.png";

// ----------------------------------------------------------------


interface IFileItem {
    Name: string;
    FullName: string,
    TimeLastModified: string;
    AuthorTitle: string;
    IsFolder: boolean;
    ServerRelativeUrl: string;
    TranslatedName?: string;
}

export const ASPRDMSHomeArabic: React.FC<IDmswebasprProps> = (props) => {
    const { libraryName } = useParams();

    const [firstLibraryName, setFirstLibraryName] = React.useState<string>('');

    const navigate = useNavigate();
    const location = useLocation();

    const [bannerItems, setBannerItems] = React.useState<IBanner[]>();
    const [libraries, setLibraries] = useState<ILibrary[]>([]);
    const [activeLibrary, setActiveLibrary] = useState<ILibrary | null>(null);
    const [files, setFiles] = useState<IFileItem[]>([]);
    const [recentFiles, setRecentFiles] = useState<IFileItem[]>([]);
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);
    const [breadcrumb, setBreadcrumb] = useState<IFileItem[]>([]);

    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState<boolean>(true);

    const [showModal, setShowModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");

    const [showModalFile, setShowModalFile] = useState(false);
    const [newFile, setNewFile] = useState("");

    const [searchQuery, setSearchQuery] = useState<string>("");

    const [selectedUsers, setSelectedUsers] = React.useState<any[]>([]);
    const [viewUsers, setViewUsers] = useState<any[]>([]);

    const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
    const [baseLibraries, setBaseLibraries] = useState([]);
    const [translatedLibraries, setTranslatedLibraries] = useState([]);
    const [isArabic, setIsArabic] = useState(false);


    const [libraryIcons, setLibraryIcons] = useState<{ [key: string]: string }>({});

    const peoplePickerContext: IPeoplePickerContext = {
        msGraphClientFactory: props.currentSPContext.msGraphClientFactory as unknown as IPeoplePickerContext["msGraphClientFactory"],
        spHttpClient: props.currentSPContext.spHttpClient as unknown as IPeoplePickerContext["spHttpClient"],
        absoluteUrl: props.currentSPContext.pageContext.web.absoluteUrl,
    };

    const [fileList, setFileList] = React.useState<File[]>([]);

    // stop multiclick on folder in table

    const [isNavigating, setIsNavigating] = useState(false);

    // 🔹 Language State
    const [language, setLanguage] = useState<"en" | "ar">("en");

    // ----------------------------------------------------------


    // 🔹 User profile state
    const [userName, setUserName] = useState<string>("");
    const [userEmail, setUserEmail] = useState<string>("");
    const [userPhotoUrl, setUserPhotoUrl] = useState<string>("");

    const itemsPerPage = 8; // sliding window size
    const [currentIndex, setCurrentIndex] = useState(
        Math.max(libraries.length - itemsPerPage, 0)
    ); // start from the latest 5


    // pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const totalPages = Math.ceil(files.length / pageSize);
    const paginatedFiles = files.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const sp = spfi().using(SPFx(props.context));

    const dropdownRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // const savedLang = localStorage.getItem("isArabic");
        // if (savedLang === "true") {
        //     setIsArabic(true);
        // }
        const sp = spfi().using(SPFx(props.currentSPContext));

        // Get first visible document library (BaseTemplate 101 = Document Library)
        sp.web.lists
            .filter("BaseTemplate eq 101 and Hidden eq false")
            .select("Title")
            .top(1)()
            .then((libs) => {
                if (libs.length > 0) {
                    setFirstLibraryName(libs[0].Title);
                }
            })
            .catch((err) => {
                console.error("Error fetching libraries:", err);
            });
    }, [props.currentSPContext]);

    useEffect(() => {
        if (location.pathname.toLowerCase() === '/library' && firstLibraryName) {
            navigate(`/Library`);
        }
    }, [location.pathname, firstLibraryName]);

    // ✅ Close dropdown if clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    // --------------------------------------- Banner part ---------------------------------------

    BannerOps().getTopBanner("*,Id,EncodedAbsUrl,FileLeafRef,FileDirRef,FileRef,FSObjType,Created,Status", "",
        "Status eq 'Active'", { column: 'Created', isAscending: false }, 1000, props)
        .then(results => {
            setBannerItems(results);
        });


    // ----------------------   Banner Slider ---------------------------------

    const sliderSettings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 5000,
        arrows: true,
    };

    const nextLibrary = () => {
        setCurrentIndex((prev) =>
            prev < libraries.length - itemsPerPage ? prev + 1 : prev
        );
    };

    const prevLibrary = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : 0));
    };




    //  ----------------------   Create a folder popup  ----------------------


    const closeModal = () => {
        setShowModal(false);
        setNewFolderName("");
    };

    const closeModalfile = () => {
        setShowModalFile(false);
        setNewFile("");
    };
    // ------------------------------------------------------------------


    // Get current 5 libraries
    const visibleLibraries = libraries.slice(
        currentIndex,
        currentIndex + itemsPerPage
    );

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const renderPageNumbers = () => {
        const pages: (number | string)[] = [];
        const firstVisible = 2; // show first 2
        const lastVisible = 2;  // show last 2

        if (totalPages <= 7) {
            // Show all if small
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            // Always show first 2
            for (let i = 1; i <= firstVisible; i++) pages.push(i);

            if (currentPage > firstVisible + 2) {
                // Add dots if we skipped some
                pages.push("...");
            }

            // Middle pages (only if not near start or end)
            if (currentPage > firstVisible && currentPage < totalPages - lastVisible + 1) {
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
            }

            if (currentPage < totalPages - lastVisible - 1) {
                // Add dots if we skipped some
                pages.push("...");
            }

            // Always show last 2
            for (let i = totalPages - lastVisible + 1; i <= totalPages; i++) {
                pages.push(i);
            }
        }

        return pages;
    };

    const toggleDropdown = () => setIsOpen(!isOpen);

    // 🔹 Utility: Recursively fetch files
    const getAllFilesRecursive = async (folderUrl: string): Promise<IFileItem[]> => {
        const folder = sp.web.getFolderByServerRelativePath(folderUrl);

        if (folderUrl.toLowerCase().endsWith("/forms")) {
            return [];
        }

        const files = await folder.files
            .select("Name", "FullName", "TimeLastModified", "Author/Title", "ServerRelativeUrl")
            .expand("Author")();

        // ✅ Use Promise.all so translation can use await
        const mappedFiles: IFileItem[] = await Promise.all(
            files.map(async (f: any) => {
                const translatedName = isArabic
                    ? await translateText(f.Name, "ar")
                    : f.Name;

                return {
                    Name: f.Name,
                    FullName: f.FullName,
                    TimeLastModified: f.TimeLastModified,
                    AuthorTitle: f.Author?.Title || "",
                    IsFolder: false,
                    ServerRelativeUrl: f.ServerRelativeUrl,
                    TranslatedName: translatedName
                };
            })
        );

        const subFolders = await folder.folders.select("Name", "ServerRelativeUrl")();

        for (const sf of subFolders) {
            if (sf.Name !== "Forms") {
                const subFiles = await getAllFilesRecursive(sf.ServerRelativeUrl);
                mappedFiles.push(...subFiles);
            }
        }

        return mappedFiles;
    };


    useEffect(() => {
        const loadUserProfile = async () => {
            try {
                const user = await sp.web.currentUser();
                setUserName(user.Title);
                setUserEmail(user.Email);
                setUserPhotoUrl(
                    `${window.location.origin}/_layouts/15/userphoto.aspx?size=L&username=${user.Email}`
                );
            } catch (err) {
                console.error("Error fetching user details:", err);
            }
        };
        loadUserProfile();
    }, []);
    // ----------------------------------------------------

    // 🔹 Load all libraries
    // useEffect(() => {
    //     const loadLibraries = async () => {
    //         const libOps = LibraryOps();
    //         const allLibs = await libOps.getAllLibraries(props);
    //         setLibraries(allLibs);
    //         setBaseLibraries(allLibs);

    //         const found = allLibs.find((l) => l.Title === libraryName);

    //         const updatedActive = translatedLibraries.find(l => l.Title === libraryName);
    //         const isArabicFound = isArabic ? translatedLibraries.find(l => l.Title === libraryName) : allLibs.find((l) => l.Title === libraryName)
    //         if (found) {
    //             setActiveLibrary(isArabicFound);
    //             setCurrentFolder(null);
    //             setBreadcrumb([]);
    //         }
    //     };
    //     loadLibraries();
    // }, [libraryName]);


    useEffect(() => {
        const loadLibraries = async () => {
            const libOps = LibraryOps();
            const allLibs = await libOps.getAllLibraries(props);

            setLibraries(allLibs);
            setBaseLibraries(allLibs);

            // 🔹 Load icons dynamically
            const iconMap = await loadLibraryIcons();
            setLibraryIcons(iconMap);

            const found = allLibs.find((l) => l.Title?.toLowerCase() === libraryName?.toLowerCase());

            const isArabicFound = isArabic
                ? translatedLibraries.find(
                    (l) => l.Title?.toLowerCase() === libraryName?.toLowerCase()
                )
                : found;

            if (found) {
                setActiveLibrary(isArabicFound);
                setCurrentFolder(null);
                setBreadcrumb([]);
            }
        };

        loadLibraries();
    }, [libraryName]);


    const currentPath = location.pathname.toLowerCase();
    const isDashboard = currentPath.includes("/dashboard");
    const isHome = currentPath.startsWith("/library/");
    const activeTab = isDashboard ? "Dashboard" : isHome ? "Home" : "";
    useEffect(() => {
        const loadFiles = async (folderUrl?: string) => {
            if (!activeLibrary) return;

            try {
                const folder = sp.web.getFolderByServerRelativePath(
                    folderUrl || activeLibrary.RootFolder.ServerRelativeUrl
                );

                // 🔹 Fetch subfolders
                const subFolders = await folder.folders
                    .select("Name", "TimeLastModified", "ServerRelativeUrl", "ListItemAllFields/FullName")
                    .expand("ListItemAllFields")();

                // 🔹 Fetch files
                const fileItems = await folder.files
                    .select("Name", "TimeLastModified", "ServerRelativeUrl", "Author/Title", "ListItemAllFields/FullName")
                    .expand("Author", "ListItemAllFields")();

                // Language direction
                const targetLang = isArabic ? "ar" : "en";


                // 🧠 TRANSLATE FUNCTION SAFE

                const safeTranslate = async (text: string) => {
                    // No translation needed when in English mode
                    if (!isArabic) return text;

                    // Already Arabic translation exists?
                    const translated = await translateText(text, "ar");
                    return translated || text;
                };


                //  MAP SUBFOLDERS + FILES

                const mappedItems: IFileItem[] = await Promise.all([
                    ...subFolders
                        .filter((f: any) => f.Name !== "Forms")
                        .map(async (f: any) => {
                            const translatedName = await safeTranslate(f.Name);

                            return {
                                Name: f.Name,
                                FullName: f.ListItemAllFields?.FullName || f.Name,
                                TimeLastModified: f.TimeLastModified,
                                AuthorTitle: "",
                                IsFolder: true,
                                ServerRelativeUrl: f.ServerRelativeUrl,
                                TranslatedName: isArabic ? translatedName : f.Name
                            };
                        }),

                    ...fileItems.map(async (f: any) => {
                        const translatedName = await safeTranslate(f.Name);

                        return {
                            Name: f.Name,
                            FullName: f.ListItemAllFields?.FullName || f.Name,
                            TimeLastModified: f.TimeLastModified,
                            AuthorTitle: f.Author?.Title || "",
                            IsFolder: false,
                            ServerRelativeUrl: f.ServerRelativeUrl,
                            TranslatedName: f.Name
                        };
                    })
                ]);

                setFiles(mappedItems);
            } catch (err) {
                console.error("Error fetching files/folders:", err);
            }
        };

        loadFiles(currentFolder || undefined);
    }, [activeLibrary, currentFolder, isArabic]);


    // Translate text Dynamically 
    const translateText = async (text: string, toLang: string): Promise<string> => {
        try {
            if (toLang === "en") {
                return text;
            }
            const response = await fetch(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${toLang}`
            );
            const data = await response.json();
            return data.responseData.translatedText;
        } catch (err) {
            console.error("Translation error:", err);
            return text; // fallback to original
        }
    };




    //  Load recent files across entire library
    useEffect(() => {
        const loadRecentFilesFromLibrary = async () => {
            if (!activeLibrary) return;

            try {
                const allFiles = await getAllFilesRecursive(activeLibrary.RootFolder.ServerRelativeUrl);

                const sorted = allFiles.sort(
                    (a, b) =>
                        new Date(b.TimeLastModified).getTime() -
                        new Date(a.TimeLastModified).getTime()
                );

                setRecentFiles(sorted.slice(0, 5)); // top 5 recent
            } catch (err) {
                console.error("Error loading recent files:", err);
            }
        };

        if (activeLibrary) {
            loadRecentFilesFromLibrary();
        }
    }, [activeLibrary]);

    // 🔹 Handle item click

    const handleItemClick = async (item: IFileItem) => {
        if (isNavigating) return; // 🚫 ignore extra clicks

        if (item.IsFolder) {
            setIsNavigating(true); // ⏳ lock clicks
            setBreadcrumb((prev) => [...prev, item]);
            setCurrentFolder(item.ServerRelativeUrl);

            // optional: small delay so double clicks don’t fire again
            setTimeout(() => setIsNavigating(false), 500);
        } else {
            window.open(item.ServerRelativeUrl + "?web=1", "_blank");
        }
    };

    // 🔹 Handle breadcrumb click

    const handleBreadcrumbClick = (index: number) => {
        if (isNavigating) return;

        setIsNavigating(true);
        const newPath = breadcrumb.slice(0, index + 1);
        setBreadcrumb(newPath);
        setCurrentFolder(newPath[newPath.length - 1].ServerRelativeUrl);

        setTimeout(() => setIsNavigating(false), 500);
    };

    // 🔹 File icons
    const getFileIcon = (fileName: string, type: "Folder" | "File") => {
        if (type === "Folder") return <FolderOutlined style={{ color: "#fa8c16" }} />;
        const extension = fileName.split(".").pop()?.toLowerCase();

        switch (extension) {
            case "pdf": return <FilePdfOutlined style={{ color: "red" }} />;
            case "doc": case "docx": return <FileWordOutlined style={{ color: "blue" }} />;
            case "xls": case "csv": case "xlsx": return <FileExcelOutlined style={{ color: "green" }} />;
            case "ppt": case "pptx": return <FilePptOutlined style={{ color: "orange" }} />;
            case "txt": return <FileTextOutlined style={{ color: "gray" }} />;
            case "md": return <FileMarkdownOutlined style={{ color: "purple" }} />;
            case "jpg": case "jpeg": case "png": case "gif": case "bmp": case "svg": case "webp":
                return <FileImageOutlined style={{ color: "#13c2c2" }} />;
            case "mp4": case "avi": case "mov": case "wmv": case "flv": case "mkv":
                return <FileOutlined style={{ color: "#722ed1" }} />;
            case "mp3": case "wav": case "aac": case "flac": case "ogg":
                return <FileOutlined style={{ color: "#faad14" }} />;
            case "zip": case "rar": case "7z": case "tar": case "gz":
                return <FileZipOutlined style={{ color: "#d48806" }} />;
            case "js": case "ts": case "jsx": case "tsx": case "html":
            case "css": case "scss": case "json": case "xml": case "sql":
            case "py": case "java": case "c": case "cpp": case "cs": case "php": case "rb": case "sh":
                return <CodeOutlined style={{ color: "#1890ff" }} />;
            default: return <FileOutlined style={{ color: "gray" }} />;
        }
    };


    const getRequestDigest = async (): Promise<string> => {
        const digestUrl = `${props.context.pageContext.web.absoluteUrl}/_api/contextinfo`;
        try {
            const response = await fetch(digestUrl, {
                method: "POST",
                headers: {
                    Accept: "application/json;odata=verbose",
                    "Content-Type": "application/json;odata=verbose",
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch request digest.");
            }

            const data = await response.json();
            return data.d.GetContextWebInformation.FormDigestValue;
        } catch (error) {
            console.error("Error fetching request digest:", error);
            throw error;
        }
    };

    // 📌 Download folder as ZIP
    const downloadFolderAsZip = async (folder: IFileItem) => {
        const zip = new JSZip();
        const folderZip = zip.folder(folder.Name)!;

        const addFilesToZip = async (folderUrl: string, parentZip: JSZip) => {
            try {
                const response = await fetch(
                    `${props.context.pageContext.web.absoluteUrl}/_api/web/GetFolderByServerRelativeUrl('${encodeURIComponent(folderUrl)}')?$expand=Files,Folders`,
                    { headers: { Accept: "application/json;odata=verbose" } }
                );

                if (!response.ok) {
                    const err = await response.text();
                    throw new Error(`Failed to fetch folder contents: ${err}`);
                }

                const data = await response.json();

                // Add files
                for (const file of data.d.Files.results) {
                    const fileResponse = await fetch(
                        `${props.context.pageContext.web.absoluteUrl}${encodeURIComponent(file.ServerRelativeUrl)}`
                    );
                    const blob = await fileResponse.blob();
                    parentZip.file(file.Name, blob);
                }

                // Recurse into subfolders
                for (const subfolder of data.d.Folders.results) {
                    const subfolderZip = parentZip.folder(subfolder.Name)!;
                    await addFilesToZip(subfolder.ServerRelativeUrl, subfolderZip);
                }
            } catch (error) {
                console.error("Error adding files to ZIP:", error);
            }
        };

        await addFilesToZip(folder.ServerRelativeUrl, folderZip);
        zip.generateAsync({ type: "blob" }).then((blob) =>
            saveAs(blob, `${folder.Name}.zip`)
        );
    };

    // 📌 Download file directly
    const downloadFile = async (fileUrl: string, fileName: string) => {
        if (!fileUrl) {
            message.error("File URL not found.");
            return;
        }

        const serverRelativeUrl = fileUrl.replace(
            props.context.pageContext.web.absoluteUrl,
            ""
        );

        const downloadApiUrl = `${props.context.pageContext.web.absoluteUrl}/_api/web/GetFileByServerRelativeUrl('${encodeURIComponent(serverRelativeUrl)}')/$value`;

        try {
            const response = await fetch(downloadApiUrl, {
                method: "GET",
                headers: {
                    Accept: "application/octet-stream",
                },
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Failed to download file. Status: ${response.status}, ${err}`);
            }

            const blob = await response.blob();
            const downloadLink = document.createElement("a");
            const objectUrl = URL.createObjectURL(blob);
            downloadLink.href = objectUrl;
            downloadLink.setAttribute("download", fileName);
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            console.error("Error downloading file:", error);
            message.error("Failed to download file.");
        }
    };

    // 📌 Delete file/folder
    const deleteItem = async (item: IFileItem) => {
        const confirmed = window.confirm(`Are you sure you want to delete ${item.Name}?`);
        if (!confirmed) return;

        const webAbsoluteUrl = props.context.pageContext.web.absoluteUrl;
        const deleteUrl = `${webAbsoluteUrl}/_api/web/${item.IsFolder
            ? "GetFolderByServerRelativeUrl"
            : "GetFileByServerRelativeUrl"
            }('${encodeURIComponent(item.ServerRelativeUrl)}')`;

        try {
            const requestDigest = await getRequestDigest();

            const response = await fetch(deleteUrl, {
                method: "POST", // ✅ SharePoint requires POST with override
                headers: {
                    Accept: "application/json;odata=verbose",
                    "X-RequestDigest": requestDigest,
                    "X-HTTP-Method": "DELETE",
                    "IF-MATCH": "*", // ✅ bypass concurrency issues
                },
            });

            if (response.ok) {
                message.success(`${item.Name} deleted successfully`);

                // ✅ Remove from UI without reload
                setFiles((prevFiles) =>
                    prevFiles.filter((f) => f.ServerRelativeUrl !== item.ServerRelativeUrl)
                );
            } else {
                const errorData = await response.text();
                message.error(`Failed to delete ${item.Name}: ${errorData}`);
            }
        } catch (error) {
            console.error("Error deleting item:", error);
            message.error(`Error deleting ${item.Name}`);
        }
    };

    // 📌 Create file/folder

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) {
            message.error("Folder name cannot be empty!");
            return;
        }

        const webAbsoluteUrl = props.context.pageContext.web.absoluteUrl;
        const folderUrl = currentFolder || activeLibrary?.RootFolder.ServerRelativeUrl;
        if (!folderUrl) return;

        setLoading(true);

        try {
            // 🔹 Generate ShortName
            const shortName = newFolderName
                .split(" ")
                .filter(w => w.toLowerCase() !== "and" && w.trim() !== "")
                .map(w => w[0].toUpperCase())
                .join("");

            const fullFolderPath = `${folderUrl}/${shortName}`.replace(/\/+/g, "/"); // use ShortName

            // 1️⃣ Check if folder already exists
            const existsResponse = await fetch(
                `${webAbsoluteUrl}/_api/web/getfolderbyserverrelativeurl('${fullFolderPath}')`,
                { method: "GET", headers: { Accept: "application/json;odata=verbose" } }
            );

            if (existsResponse.ok) {
                message.warning(`A folder with short name '${shortName}' already exists.`);
                setLoading(false);
                return;
            }

            // 2️⃣ Create folder with ShortName
            const newFolder = await sp.web
                .getFolderByServerRelativePath(folderUrl)
                .folders.addUsingPath(shortName);

            const folderItemUrl = `${webAbsoluteUrl}/_api/web/getfolderbyserverrelativeurl('${fullFolderPath}')/ListItemAllFields`;

            // 3️⃣ Get Request Digest
            const digestResponse = await fetch(`${webAbsoluteUrl}/_api/contextinfo`, {
                method: "POST",
                headers: { Accept: "application/json;odata=verbose" },
            });
            const digestData = await digestResponse.json();
            const requestDigest = digestData.d.GetContextWebInformation.FormDigestValue;

            // 4️⃣ Update "FullName" field with original name
            const folderItem = await sp.web.getFolderByServerRelativePath(fullFolderPath).getItem();
            await folderItem.update({ FullName: newFolderName });

            // 5️⃣ Break inheritance
            await fetch(`${folderItemUrl}/breakroleinheritance(copyRoleAssignments=false, clearSubscopes=true)`, {
                method: "POST",
                headers: {
                    Accept: "application/json;odata=verbose",
                    "X-RequestDigest": requestDigest,
                },
            });

            // 6️⃣ Get Role Definitions
            const roleDefsResponse = await fetch(`${webAbsoluteUrl}/_api/web/roledefinitions`, {
                method: "GET",
                headers: { Accept: "application/json;odata=verbose" },
            });
            const roleDefsData = await roleDefsResponse.json();
            const roleDefinitions = roleDefsData.d.results;

            const docEditorsRole = roleDefinitions.find((r: any) => r.Name === "DocumentEditors");
            const docViewRole = roleDefinitions.find((r: any) => r.Name === "DocumentView");

            if (!docEditorsRole || !docViewRole) {
                message.error("Custom permission levels 'DocumentEditors' or 'DocumentView' not found.");
                return;
            }

            // 7️⃣ Assign "DocumentEditors" permissions
            for (const user of selectedUsers) {
                try {
                    const encodedLoginName = encodeURIComponent(user.loginName);
                    const userInfoRes = await fetch(`${webAbsoluteUrl}/_api/web/ensureuser('${encodedLoginName}')`, {
                        method: "POST",
                        headers: {
                            Accept: "application/json;odata=verbose",
                            "Content-Type": "application/json;odata=verbose",
                            "X-RequestDigest": requestDigest,
                        },
                    });
                    const userInfoData = await userInfoRes.json();
                    const userId = userInfoData.d.Id;

                    await fetch(
                        `${folderItemUrl}/roleassignments/addroleassignment(principalid=${userId},roledefid=${docEditorsRole.Id})`,
                        {
                            method: "POST",
                            headers: {
                                Accept: "application/json;odata=verbose",
                                "X-RequestDigest": requestDigest,
                            },
                        }
                    );
                } catch (err) {
                    console.warn(`Failed to assign DocumentEditors to ${user.loginName}:`, err);
                }
            }

            // 8️⃣ Assign "DocumentView" permissions
            for (const user of viewUsers) {
                try {
                    const encodedLoginName = encodeURIComponent(user.loginName);
                    const userInfoRes = await fetch(`${webAbsoluteUrl}/_api/web/ensureuser('${encodedLoginName}')`, {
                        method: "POST",
                        headers: {
                            Accept: "application/json;odata=verbose",
                            "Content-Type": "application/json;odata=verbose",
                            "X-RequestDigest": requestDigest,
                        },
                    });
                    const userInfoData = await userInfoRes.json();
                    const userId = userInfoData.d.Id;

                    await fetch(
                        `${folderItemUrl}/roleassignments/addroleassignment(principalid=${userId},roledefid=${docViewRole.Id})`,
                        {
                            method: "POST",
                            headers: {
                                Accept: "application/json;odata=verbose",
                                "X-RequestDigest": requestDigest,
                            },
                        }
                    );
                } catch (err) {
                    console.warn(`Failed to assign DocumentView to ${user.loginName}:`, err);
                }
            }

            // ✅ Final success
            message.success(
                `Folder '${newFolderName}' created (ShortName: '${shortName}') with custom permissions.`
            );
            closeModal();
            setNewFolderName("");

            // 🔄 Refresh UI
            setCurrentFolder(null);
            setTimeout(() => setCurrentFolder(folderUrl), 0);
        } catch (err) {
            console.error("Error creating folder with permissions:", err);
            message.error("An error occurred while creating the folder or assigning permissions.");
        } finally {
            setLoading(false);
        }
    };



    // 📌 Upload file

    const handleFileUpload = async (fileList: File[]) => {
        if (!activeLibrary) {
            message.error("No active library selected.");
            return;
        }

        const webAbsoluteUrl = props.context.pageContext.web.absoluteUrl;

        // ✅ Target folder = last breadcrumb OR library root
        const targetFolder =
            breadcrumb.length > 0
                ? breadcrumb[breadcrumb.length - 1].ServerRelativeUrl
                : activeLibrary.RootFolder.ServerRelativeUrl;

        try {
            setLoading(true);
            const requestDigest = await getRequestDigest();

            const uploadPromises = fileList.map(async (file) => {
                const uploadUrl = `${webAbsoluteUrl}/_api/web/GetFolderByServerRelativeUrl('${targetFolder}')/Files/add(overwrite=true, url='${file.name}')`;

                try {
                    const fileBuffer = await file.arrayBuffer();

                    const response = await fetch(uploadUrl, {
                        method: "POST",
                        body: fileBuffer,
                        headers: {
                            "Accept": "application/json;odata=verbose",
                            "X-RequestDigest": requestDigest,
                            "Content-Type": "application/octet-stream",
                        },
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        return { file, success: false, error: errorData.error.message.value };
                    }

                    return { file, success: true };
                } catch (error: any) {
                    return { file, success: false, error: error.message };
                }
            });

            const results = await Promise.all(uploadPromises);

            const successFiles = results.filter((res) => res.success).map((res) => res.file.name);
            const failedFiles = results.filter((res) => !res.success);

            if (successFiles.length > 0) {
                message.success(`Uploaded: ${successFiles.join(", ")}`);

                // ✅ Reload files in the current folder instead of resetting state
                const folder = sp.web.getFolderByServerRelativePath(targetFolder);

                const subFolders = await folder.folders
                    .select("Name", "TimeLastModified", "ServerRelativeUrl")();

                const fileItems = await folder.files
                    .select("Name", "TimeLastModified", "Author/Title", "ServerRelativeUrl")
                    .expand("Author")();

                const mappedItems: IFileItem[] = [
                    ...subFolders.map((f: any) => ({
                        Name: f.Name,
                        FullName: f.FullName,
                        TimeLastModified: f.TimeLastModified,
                        AuthorTitle: "",
                        IsFolder: true,
                        ServerRelativeUrl: f.ServerRelativeUrl,
                    })),
                    ...fileItems.map((f: any) => ({
                        Name: f.Name,
                        FullName: f.FullName,
                        TimeLastModified: f.TimeLastModified,
                        AuthorTitle: f.Author?.Title || "",
                        IsFolder: false,
                        ServerRelativeUrl: f.ServerRelativeUrl,
                    })),
                ];

                setFiles(mappedItems);

                closeModalfile();
            }

            if (failedFiles.length > 0) {
                message.error(
                    `Failed uploads:\n${failedFiles.map((res) => `${res.file.name}: ${res.error}`).join("\n")}`
                );
            }
        } catch (error) {
            message.error("Upload failed due to authentication error.");
            console.error("Authentication Error:", error);
        } finally {
            setLoading(false);
        }
    };

    // const filteredLibraries = (searchQuery
    //     ? libraries.filter((lib) =>
    //         lib.Title.toLowerCase().includes(searchQuery.toLowerCase())
    //     )
    //     : visibleLibraries
    // );

    const filteredLibraries = React.useMemo(() => {
        const libsToUse = isArabic ? translatedLibraries : baseLibraries;

        const baseArray = searchQuery
            ? libsToUse.filter((lib) => {
                const textToSearch = isArabic
                    ? lib.TranslatedTitle || lib.Title
                    : lib.Title;
                return textToSearch.toLowerCase().includes(searchQuery.toLowerCase());
            })
            : libsToUse;

        const start = currentIndex;
        const end = currentIndex + itemsPerPage;

        return baseArray.slice(start, end);
    }, [baseLibraries, translatedLibraries, currentIndex, itemsPerPage, searchQuery, isArabic]);

    // Dynamic Translation
    const handleTranslateClick = async () => {
        const targetLang = isArabic ? "en" : "ar";

        // 🔹 Translate libraries only once
        if (!isArabic && translatedLibraries.length === 0) {
            const translatedLibs = await Promise.all(
                baseLibraries.map(async (lib) => {
                    const translatedTitle = await translateText(lib.Title, targetLang);
                    return { ...lib, TranslatedTitle: translatedTitle };
                })
            );

            setTranslatedLibraries(translatedLibs);

            if (activeLibrary) {
                const updatedActive = translatedLibs.find(
                    l => l.Id === activeLibrary.Id
                );
                setActiveLibrary(updatedActive || null);
            }
        }

        const nextIsArabic = !isArabic;

        // ✅ SAVE GLOBALLY
        localStorage.setItem("isArabic", nextIsArabic.toString());

        setIsArabic(nextIsArabic);
        setLanguage(nextIsArabic ? "ar" : "en");
        setCurrentIndex(0);
    };


    const fileColumns: IColumn[] = [
        {
            key: "name",
            name: isArabic ? "الاسم" : "Name",
            minWidth: 260,
            isResizable: true,
            onRender: (f: IFileItem) => (
                <Tooltip title={f.FullName || f.Name}>
                    <span
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            cursor: "pointer"
                        }}
                        onClick={() => handleItemClick(f)}
                    >
                        {getFileIcon(f.Name, f.IsFolder ? "Folder" : "File")}
                        <span style={{ marginInlineStart: 8 }}>
                            {isArabic ? f.TranslatedName : f.Name}
                        </span>
                    </span>
                </Tooltip>
            )
        },
        {
            key: "modified",
            name: isArabic ? "تاريخ التعديل" : "Modified",
            minWidth: 120,
            onRender: (f: IFileItem) =>
                f.TimeLastModified
                    ? new Date(f.TimeLastModified).toLocaleDateString()
                    : "-"
        },
        {
            key: "owner",
            name: isArabic ? "المالك" : "Owner",
            minWidth: 150,
            fieldName: "AuthorTitle"
        },
        {
            key: "actions",
            name: isArabic ? "الإجراءات" : "Actions",
            minWidth: 130,
            onRender: (f: IFileItem) => (
                <div onClick={(e) => e.stopPropagation()}>
                    <DownloadOutlined
                        style={{
                            color: "#1890ff",
                            marginInlineEnd: 12,
                            cursor: "pointer"
                        }}
                        onClick={() =>
                            f.IsFolder
                                ? downloadFolderAsZip(f)
                                : downloadFile(f.ServerRelativeUrl, f.Name)
                        }
                    />

                    <DeleteOutlined
                        style={{ color: "red", cursor: "pointer" }}
                        onClick={() => deleteItem(f)}
                    />
                </div>
            )
        }
    ];

    // const libraryIconMap: { [key: string]: string } = {
    //     "Chairman Office": "fas fa-briefcase",
    //     "Economic Regulation and Markets": "fas fa-balance-scale",
    //     "Energy": "fas fa-bolt",
    //     "Legal and Customer Affairs": "fas fa-gavel",
    //     "Planning and Institutional Performance Development": "fas fa-chart-line",
    //     "Sustainable Energy": "fas fa-leaf",
    //     "Water and Wastewater": "fas fa-tint",
    // };


    const loadLibraryIcons = async (): Promise<{ [key: string]: string }> => {
        const items = await sp.web.lists
            .getByTitle("Icons")
            .items.select("RepositoryName", "IconName")();

        const iconMap: { [key: string]: string } = {};

        items.forEach((item) => {
            if (item.RepositoryName && item.IconName) {
                iconMap[item.RepositoryName.toLowerCase().trim()] =
                    item.IconName.trim();
            }
        });

        return iconMap;
    };



    // const getLibraryIcon = (title: string) => {
    //     return libraryIconMap[title] || ""; // default icon
    // };

    const getLibraryIcon = (title: string) => {
        if (!title) return "";

        return (
            libraryIcons[title.toLowerCase().trim()] ||
            "fas fa-folder" // ✅ default icon
        );
    };




    return (
        <div
            className={`dashboard ${isArabic ? "rtl" : ""}`}
            dir={isArabic ? "rtl" : "ltr"}
        >
            <div className="Navbarstrip">
                <div className="Headingstrip">
                    {/* Left - Logo */}
                    <div className="mainlogo">
                        <img src={logo} className="logo" />
                        <img src={logoname} alt="" className="logoname" />
                    </div>

                    {/* Center - Heading */}
                    <h1 className="heading"> {isArabic ? "لوحة معلومات نظام إدارة المستندات" : "Document Management System Dashboard"} </h1>

                    {/* Right - User Profile */}
                    <div className="userProfile">
                        {userPhotoUrl && <img src={userPhotoUrl} alt="User Profile" />}
                        <div>
                            <span>{userName}</span>
                        </div>
                    </div>
                </div>
                <div className="Headline"></div>
                <div className={isArabic ? "erp-topbannerbox" : "topbannerbox"}>
                    <div className="navmainsection">
                        <ul className="nav-tabs">
                            <li>
                                <div className={isArabic ? "erp-lang-toggle" : "lang-toggle"}>
                                    <button
                                        className={`lang-btn ${language === "en" ? "active" : ""}`}
                                        onClick={handleTranslateClick}
                                    >
                                        {/* <span className="icon">🌐</span> */}
                                        <i className="fas fa-globe-americas icon"></i>
                                        ENG
                                    </button>

                                    <button
                                        className={`lang-btn ${language === "ar" ? "active" : ""}`}
                                        onClick={handleTranslateClick}
                                    >
                                        {/* <span className="icon">🌐</span> */}
                                        <i className="fas fa-globe-asia icon"></i>
                                        العربية
                                    </button>
                                </div>

                            </li>

                        </ul>
                    </div>
                    <div className="LibSearch">
                        {/* Search Input */}
                        <Input.Search
                            placeholder="Find a Library"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="Sealib"
                            allowClear
                        />
                    </div>
                </div>
                <div className="Headlinetwo"></div>
            </div>

            {/* Library Tabs */}

            <div className="block-banner">
                <div className="carousel-container">

                    {bannerItems && bannerItems.length > 0 ? (
                        bannerItems.length === 1 ? (
                            <div>
                                <div className="banner-container">
                                    <img src={bannerItems[0].EncodedAbsUrl} className="banner-image" />
                                </div>
                                <div className="Headingtitle">

                                </div>
                            </div>
                        ) : (
                            <Slider {...sliderSettings}>
                                {bannerItems.map((item) => (
                                    <div key={item.Id}>
                                        <div className="banner-container">
                                            <img src={item.EncodedAbsUrl} alt={item.Title} className="banner-image" />
                                        </div>
                                    </div>
                                ))}
                            </Slider>
                        )
                    ) : (
                        <p>{isArabic ? "لا توجد لافتات متاحة" : "No banners available"}</p>
                    )}

                </div>
            </div>

            <div className="libraryContainer">
                {/* Heading + Dropdown */}

                {/* Repository Boxes */}
                <div className="librarySliderWrapper">

                    <div className="libraryTabs">
                        {filteredLibraries.length > 0 ? (
                            filteredLibraries.map((lib) => (
                                <a
                                    key={lib.Id}
                                    // href={`#/library/${lib.Title}`}
                                    className="circleBox"
                                    onClick={() =>
                                        navigate(`/library/${lib.Title}`, {
                                            state: { isArabic }
                                        })
                                    }
                                    style={{ cursor: "pointer" }}
                                >
                                    <div className="erp-card">
                                        {/* Header */}
                                        <div className="erp-card-header">
                                            <span className={isArabic ? "erp-titleArabic" : "erp-title"}>
                                                {isArabic ? lib.TranslatedTitle || lib.Title : lib.Title}
                                            </span>
                                            <a href="" className="imageiconcircle">
                                                {/* <img src={libraraylogo} alt="Library" className="erp-icon" /> */}
                                                <i className={`${getLibraryIcon(lib.Title)} erp-icon`}></i>
                                            </a>
                                        </div>

                                        {/* Body */}
                                        <div className="erp-card-body">
                                            <p>
                                                {isArabic ? "الوصول إلى أنظمة إدارةالموظفين." : "Access employee management systems."}
                                            </p>
                                            {/* Footer Button */}
                                            <div className="erp-card-footer">
                                                <span>
                                                    {isArabic ? "الوصول هنا" : "Access Here"}
                                                </span>
                                                <img src={link} alt="" />
                                            </div>
                                        </div>
                                    </div>
                                </a>

                            ))
                        ) : (
                            <p style={{ textAlign: "center", marginTop: "20px" }}>
                                {isArabic ? "لم يتم العثور على مكتبات" : "No libraries found"}
                            </p>
                        )}
                    </div>

                    {!searchQuery && (
                        <div className={isArabic ? "erp-sliderButtons" : "sliderButtons"}>
                            <button className="sliderBtn left" onClick={prevLibrary} disabled={currentIndex === 0}>
                                <img src={leftblack} alt="Previous" className="iconblack" />
                            </button>
                            <button
                                className="sliderBtn right"
                                onClick={nextLibrary}
                                disabled={currentIndex + itemsPerPage >= libraries.length}
                            >
                                <img src={rightblack} alt="Next" className="iconblack" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* <div className="Buttondrop" style={{display:"none !important"}}>
                <div className="libhead">
                    <div className="dropdown" ref={dropdownRef}>
                        <button className="dropbtn" onClick={toggleDropdown}>
                            {isArabic ? "إنشاء وتحميل" : "Create & Upload"} <img src={DownArrow} className="downArrow" />
                        </button>

                        <div className={`dropdown-content ${isOpen ? "show" : ""}`}>
                            <a onClick={() => { setShowModal(true); setIsOpen(false); }} className="cursor"><span className="icon"><img src={Plus} alt="" /></span> {isArabic ? "مجلد جديد" : "New Folder"}</a>
                            <a onClick={() => { setShowModalFile(true); setIsOpen(false); }} className="cursor"><span className="icon"><img src={Upload} alt="" /></span>{isArabic ? "تحميل ملف" : "Upload File"}</a>
                            <Link to="/Request" target="_blank"><span className="icon"><img src={Plus} alt="" /></span> {isArabic ? "إنشاء مستودع" : "Create Repository"}</Link>
                        </div>
                    </div>
                </div>
            </div> */}

            {/* Content Section */}
            {/* <div className="contentSection" style={{display:"none !important"}}>

                <div className="block">
                    <div className="box-header">
                        <h2 dir={isArabic ? "rtl" : "ltr"}>
                            {isArabic
                                ? `المجلدات والملفات في ${activeLibrary?.TranslatedTitle || activeLibrary?.Title}`
                                : `Folders & Files of ${activeLibrary?.Title}`}
                        </h2>
                    </div>
                    <div className="box">

                        {activeLibrary && (
                            <div className="arrow-breadcrumbs">
                                <div
                                    className="arrow-crumb"
                                    onClick={() => {
                                        setBreadcrumb([]);
                                        setCurrentFolder(null);
                                    }}
                                >
                                    {isArabic ? activeLibrary?.TranslatedTitle || activeLibrary?.Title : activeLibrary?.Title}
                                </div>

                                {breadcrumb.map((b, i) => (
                                    <div
                                        key={i}
                                        className="arrow-crumb"
                                        onClick={() => handleBreadcrumbClick(i)}
                                    >
                                        {b.TranslatedName}
                                    </div>
                                ))}
                            </div>
                        )}

                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{isArabic ? "الاسم" : "Name"}</th>
                                    <th>{isArabic ? "تاريخ التعديل" : "Modified"}</th>
                                    <th>{isArabic ? "المالك" : "Owner"}</th>
                                    <th>{isArabic ? "الإجراءات" : "Actions"}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedFiles.length > 0 ? (
                                    paginatedFiles.map((f, i) => (
                                        <tr
                                            key={i}
                                            onClick={() => handleItemClick(f)}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <td>
                                                <Tooltip title={f.FullName || f.Name}>
                                                    <span style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                                                        {getFileIcon(f.Name, f.IsFolder ? "Folder" : "File")}
                                                        <span style={{ marginLeft: "6px" }}>{f.TranslatedName}</span>
                                                    </span>
                                                </Tooltip>
                                            </td>
                                            <td>
                                                {f.TimeLastModified
                                                    ? new Date(f.TimeLastModified).toLocaleDateString()
                                                    : "-"}
                                            </td>
                                            <td>{f.AuthorTitle}</td>
                                            <td
                                                onClick={(e) => e.stopPropagation()} // ⛔ prevent row click navigation
                                            >
                                                {f.IsFolder ? (
                                                    <DownloadOutlined
                                                        style={{ color: "#1890ff", marginRight: 12, cursor: "pointer" }}
                                                        onClick={() => downloadFolderAsZip(f)}
                                                    />
                                                ) : (
                                                    <DownloadOutlined
                                                        style={{ color: "#1890ff", marginRight: 12, cursor: "pointer" }}
                                                        // style={{ color: "#1890ff", marginRight: 12, cursor: "pointer", display: isAuthorized ? "inline-block" : "none" }}
                                                        onClick={() => downloadFile(f.ServerRelativeUrl, f.Name)}
                                                    />
                                                )}

                                                <DeleteOutlined
                                                    style={{ color: "red", cursor: "pointer" }}
                                                    onClick={() => deleteItem(f)}
                                                />
                                            </td>

                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="noData">
                                            {isArabic ? "لم يتم العثور على أي ملفات أو مجلدات" : "No files or folders found"}

                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
 



                        {files.length > pageSize && (

                            <div className="pagination">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    «
                                </button>

                                {renderPageNumbers().map((p, index) =>
                                    p === "..." ? (
                                        <span key={index} className="dots">...</span>
                                    ) : (
                                        <button
                                            key={p}
                                            className={p === currentPage ? "active" : ""}
                                            onClick={() => handlePageChange(Number(p))}
                                        >
                                            {p}
                                        </button>
                                    )
                                )}

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    »
                                </button>
                            </div>

                        )}

                    </div>
                </div>

                <div className="block">
                    <div className="box-headersec">
                        <h2>{isArabic ? "أحدث الملفات" : "Recent Files"}</h2>
                    </div>
                    <div className="box recentFiles">
                        <ul>

                            {recentFiles.length > 0 ? (
                                recentFiles.map((f, i) => (
                                    <li
                                        key={i}
                                        style={{ cursor: "pointer" }}
                                        onClick={() => window.open(f.ServerRelativeUrl + "?web=1", "_blank")}
                                    >
                                        {getFileIcon(f.Name, "File")}{" "}
                                        <span style={{ marginLeft: "6px" }}>{f.TranslatedName}</span>{" "}
                                        ({new Date(f.TimeLastModified).toLocaleDateString()})
                                    </li>
                                ))
                            ) : (
                                <li> {isArabic ? "لا توجد ملفات حديثة" : "No recent files"}</li>
                            )}

                        </ul>

                    </div>
                </div>
            </div> */}

            {/* Modal for Folder */}
            {/* {showModal && (
                <div className="modalOverlay">
                    <div className="modalContent">
                        <div className="modelbox">
                            <h3>{isArabic ? "قم بإنشاء مجلد" : "Create a folder"}</h3>
                        </div>
                        <div className="Modelboxdown">
                            <label htmlFor="FolderName">{isArabic ? "اسم المجلد" : "FolderName"}</label>
                            <input
                                placeholder="Enter new folder name"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                className="modelinput"
                            />

                            <div style={{ marginTop: 10, marginBottom: 10, textAlign: "left" }}>
                                <label htmlFor="Edit">{isArabic ? "يحرر" : "Edit"}</label>
                                <PeoplePicker
                                    context={peoplePickerContext}
                                    // titleText="Edit"
                                    personSelectionLimit={5}
                                    groupName={""}
                                    showtooltip={true}
                                    required={false}
                                    disabled={false}
                                    onChange={(items: any[]) => setSelectedUsers(items)} // ✅ correct usage
                                    showHiddenInUI={false}
                                    principalTypes={[PrincipalType.User]}
                                    resolveDelay={1000}
                                />
                            </div>
                            <div style={{ marginTop: 10, marginBottom: 10, textAlign: "left" }}>
                                <label htmlFor="View">{isArabic ? "منظر" : "View"}</label>
                                <PeoplePicker
                                    context={peoplePickerContext}
                                    // titleText="View"
                                    personSelectionLimit={5}
                                    groupName={""}
                                    showtooltip={true}
                                    required={false}
                                    disabled={false}
                                    onChange={(items: any[]) => setViewUsers(items)}

                                    showHiddenInUI={false}
                                    principalTypes={[PrincipalType.User]}
                                    resolveDelay={1000}
                                />
                            </div>

                            <div style={{ textAlign: "center" }}>
                                <button type="button" className="createbtn" onClick={handleCreateFolder}>
                                    {isArabic ? "يخلق" : "Create"}
                                </button>
                                <button type="button" className="closebtn" onClick={closeModal}>
                                    {isArabic ? "يلغي" : "Cancel"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )} */}

            {/* Modal for Files */}
            {/* {showModalFile && (
                <div className="modalOverlay">
                    <div className="modalContent">
                        <div className="modelbox">
                            <h3>{isArabic ? "إجراء تحميل المستند" : "Document Upload Procedure"}</h3>
                        </div>
                        <div className="Modelboxdown">
                            <label htmlFor="Attachments">{isArabic ? "المرفقات" : "Attachments"} <span style={{ color: "red" }}>*</span></label>
                            <input type="file" multiple style={{ border: "1px solid #ddd", padding: "3px", borderRadius: "3px", marginBottom: "1rem" }}
                                onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    setFileList(files);
                                }} />

                            <div style={{ textAlign: "center" }}>
                                <button type="button" className="createbtn" onClick={() => handleFileUpload(fileList)}>
                                    {isArabic ? "يخلق" : "Create"}
                                </button>
                                <button type="button" className="closebtn" onClick={closeModalfile}>
                                    {isArabic ? "يلغي" : "Cancel"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )} */}
        </div >
    );
};
