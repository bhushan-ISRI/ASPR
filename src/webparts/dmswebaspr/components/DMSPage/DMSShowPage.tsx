import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { IFolderInfo, spfi, SPFx } from "@pnp/sp/presets/all";
import { IDmswebasprProps } from "../IDmswebasprProps";
import { Tooltip, message } from "antd";
import {
    FolderOutlined,
    DownloadOutlined,
    DeleteOutlined,
    FileOutlined
} from "@ant-design/icons";
import logo from "../../assets/img/Logo.png";
import logoname from "../../assets/img/LogoName.png";
import libraraylogo from "../../assets/img/libraraylogo.png";
import DownArrow from "../../assets/img/DownArrow.png";
import Plus from "../../assets/img/Plus.png";
import Upload from "../../assets/img/Upload.png";
import rightblack from "../../assets/img/Rightblack.png";
import leftblack from "../../assets/img/Leftblack.png";
import link from "../../assets/img/link.png";
import { PeoplePicker, PrincipalType, IPeoplePickerContext } from "@pnp/spfx-controls-react/lib/PeoplePicker";
import { ILibrary } from "../../services/interface/ILibrary";
import { set } from "@microsoft/sp-lodash-subset/lib/index";
import LibraryOps from "../../services/bal/Library";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { useLocation } from "react-router-dom";

interface IFileItem {
    Name: string;
    FullName: string,
    TimeLastModified: string;
    AuthorTitle: string;
    IsFolder: boolean;
    ServerRelativeUrl: string;
    TranslatedName?: string;
}
interface IFolderWithListItem extends IFolderInfo {
    Author: any;
    ListItemAllFields?: {
        FullName?: string;
    };
}

export const LibraryDocuments: React.FC<IDmswebasprProps> = (props) => {
    const { libraryName } = useParams<{ libraryName: string }>();
    const sp = spfi().using(SPFx(props.context));

    const location = useLocation();

    const isArabic = location.state?.isArabic ?? localStorage.getItem("isArabic") === "true";
    const [files, setFiles] = useState<IFileItem[]>([]);
    const [breadcrumb, setBreadcrumb] = useState<IFileItem[]>([]);
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [newFile, setNewFile] = useState("");
    const [showModalFile, setShowModalFile] = useState(false);
    const [selectedUsers, setSelectedUsers] = React.useState<any[]>([]);
    const [viewUsers, setViewUsers] = useState<any[]>([]);
    const [activeLibrary, setActiveLibrary] = useState<ILibrary | null>(null);
    const [libraries, setLibraries] = useState<ILibrary[]>([]);
    const [fileList, setFileList] = React.useState<File[]>([]);
    const navigate = useNavigate();
    const [translatedLibraryName, setTranslatedLibraryName] = useState<string>(libraryName || "");
    const peoplePickerContext: IPeoplePickerContext = {
        msGraphClientFactory: props.currentSPContext.msGraphClientFactory as unknown as IPeoplePickerContext["msGraphClientFactory"],
        spHttpClient: props.currentSPContext.spHttpClient as unknown as IPeoplePickerContext["spHttpClient"],
        absoluteUrl: props.currentSPContext.pageContext.web.absoluteUrl,
    };

    useEffect(() => {
        // const savedLang = localStorage.getItem("isArabic");
        // if (savedLang === "true") {
        //     setIsArabic(true);
        // }
        const sp = spfi().using(SPFx(props.currentSPContext));

        // Get first visible document library (BaseTemplate 101 = Document Library)
        const loadLibraries = async () => {
            const libOps = LibraryOps();
            const allLibs = await libOps.getAllLibraries(props);


            if (allLibs.length > 0) {
                setLibraries(allLibs);
                const selectedLibrary = allLibs.find(
                    (lib) => lib.Title === libraryName
                );

                if (selectedLibrary) {
                    setActiveLibrary(selectedLibrary);
                    setCurrentFolder(null);
                    setBreadcrumb([]);
                }
            }


        };
        loadLibraries();
    }, [props.currentSPContext]);

    const closeModal = () => {
        setShowModal(false);
        setNewFolderName("");
    };

    const closeModalfile = () => {
        setShowModalFile(false);
        setNewFile("");
    };
    useEffect(() => {
        const translateLibraryName = async () => {
            if (!libraryName) return;

            if (!isArabic) {
                setTranslatedLibraryName(libraryName);
                return;
            }

            const translated = await translateText(libraryName, "ar");
            setTranslatedLibraryName(translated || libraryName);
        };
        translateLibraryName();
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
    // 🔹 Load files
    const toggleDropdown = () => setIsOpen(!isOpen);

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

    useEffect(() => {
        const loadFiles = async () => {
            if (!libraryName) return;
            setLoading(true);
            try {
                const rootFolder = await sp.web
                    .lists.getByTitle(libraryName)
                    .rootFolder();

                const folder = sp.web.getFolderByServerRelativePath(
                    currentFolder || rootFolder.ServerRelativeUrl
                );

                // const folder = sp.web.getFolderByServerRelativePath(
                //                 folderUrl || activeLibrary.RootFolder.ServerRelativeUrl
                //             );

                // 🔹 Fetch subfolders
                const subFolders = await folder.folders
                    .select("Name", "TimeLastModified", "ServerRelativeUrl", "ListItemAllFields/FullName")
                    .expand("ListItemAllFields")() as unknown as IFolderWithListItem[];;

                // 🔹 Fetch files
                const fileItems = await folder.files
                    .select("Name", "TimeLastModified", "ServerRelativeUrl", "Author/Title", "ListItemAllFields/FullName")
                    .expand("Author", "ListItemAllFields")() as unknown as IFolderWithListItem[];
                const safeTranslate = async (text: string) => {
                    // No translation needed when in English mode
                    if (!isArabic) return text;

                    // Already Arabic translation exists?
                    const translated = await translateText(text, "ar");
                    return translated || text;
                };

                const mapped: IFileItem[] = await Promise.all([
                    ...subFolders
                        .filter(f => f.Name !== "Forms")
                        .map(async (f) => {
                            const translatedName = isArabic
                                ? await translateText(f.Name, "ar")
                                : f.Name;

                            return {
                                Name: f.Name,
                                FullName: f.ListItemAllFields?.FullName || f.Name,
                                TimeLastModified: "",
                                AuthorTitle: "",
                                IsFolder: true,
                                ServerRelativeUrl: f.ServerRelativeUrl,
                                TranslatedName: translatedName
                            };
                        }),

                    ...fileItems.map(async (f) => {
                        const translatedName = isArabic
                            ? await translateText(f.Name, "ar")
                            : f.Name;

                        return {
                            Name: f.Name,
                            TimeLastModified: f.TimeLastModified,
                            FullName: f.ListItemAllFields?.FullName || f.Name,
                            AuthorTitle: f.Author?.Title || "",
                            IsFolder: false,
                            ServerRelativeUrl: f.ServerRelativeUrl,
                            TranslatedName: translatedName
                        };
                    })
                ]);


                setFiles(mapped);
            } catch (err) {
                console.error(err);
                message.error("Failed to load documents");
            } finally {
                setLoading(false);
            }
        };

        loadFiles();
    }, [libraryName, currentFolder]);
    useEffect(() => {
        if (!isArabic) return;

        const updateBreadcrumbTranslations = async () => {
            const updated = await Promise.all(
                breadcrumb.map(async (b) => ({
                    ...b,
                    TranslatedName: b.TranslatedName || await translateText(b.Name, "ar")
                }))
            );

            setBreadcrumb(updated);
        };

        updateBreadcrumbTranslations();
    }, [isArabic]);

    // 🔹 Click handler
    const handleItemClick = (item: IFileItem) => {
        if (item.IsFolder) {
            setBreadcrumb(prev => {
                // 🔹 Avoid duplicates
                if (prev.find(b => b.ServerRelativeUrl === item.ServerRelativeUrl)) {
                    return prev;
                }

                return [
                    ...prev,
                    {
                        ...item,
                        // ✅ ensure breadcrumb has translated name
                        TranslatedName: item.TranslatedName || item.Name
                    }
                ];
            });

            setCurrentFolder(item.ServerRelativeUrl);
        } else {
            window.open(item.ServerRelativeUrl + "?web=1", "_blank");
        }
    };


    // 🔹 Breadcrumb click
    const handleBreadcrumbClick = (index: number) => {
        const path = breadcrumb.slice(0, index + 1);
        setBreadcrumb(path);
        setCurrentFolder(path[path.length - 1].ServerRelativeUrl);
    };
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

                const mappedItems: IFileItem[] = await Promise.all([
                    ...subFolders.map(async (f: any) => {
                        const translatedName = isArabic
                            ? await translateText(f.Name, "ar")
                            : f.Name;

                        return {
                            Name: f.Name,
                            FullName: f.FullName,
                            TimeLastModified: f.TimeLastModified,
                            AuthorTitle: "",
                            IsFolder: true,
                            ServerRelativeUrl: f.ServerRelativeUrl,
                            TranslatedName: translatedName
                        };
                    }),

                    ...fileItems.map(async (f: any) => {
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
                ]);

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

    return (
        <div className={`document-page ${isArabic ? "rtl" : "ltr"}`}
            dir={isArabic ? "rtl" : "ltr"}>
            <h2 style={{ background: "#006a5d", color: "white" }}>
                {isArabic
                    ? `المجلدات والملفات في ${translatedLibraryName}`
                    : `Folders & Files of ${libraryName}`}
            </h2>
            <div className="Buttondrop">
                <div className="libhead">

                    <button className="dropbtn" onClick={() => { navigate(`/Library`); }}>
                        {isArabic ? "الصفحة الرئيسية" : "Home"}                  </button>
                </div>
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
            </div>
            {/* Breadcrumb */}
            <div className="arrow-breadcrumbs">
                <span
                    className="arrow-crumb"
                    onClick={() => {
                        setBreadcrumb([]);
                        setCurrentFolder(null);
                    }}
                >
                    {isArabic ? translatedLibraryName : libraryName}
                </span>
                <i className="fas fa-angle-right"></i>
                {breadcrumb.map((b, i) => (
                    <>
                    <span
                        key={i}
                        className="arrow-crumb"
                        onClick={() => handleBreadcrumbClick(i)}
                    >
                        {isArabic ? (b.TranslatedName || b.Name) : b.Name}
                        
                    </span>
                    <i className="fas fa-angle-right"></i>
                    </>
                ))}
            </div>

            {/* Table */}
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
                    {files.length > 0 ? (
                        files.map((f, i) => (
                            <tr key={i} onClick={() => handleItemClick(f)}>
                                <td>
                                    {f.IsFolder ? <FolderOutlined /> : <FileOutlined />}{" "}
                                    {isArabic && !f.TranslatedName ? "..." : (f.TranslatedName || f.Name)}

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
                            <td colSpan={4}>{isArabic ? "لم يتم العثور على أي ملفات أو مجلدات" : "No files or folders found"}</td>
                        </tr>
                    )}
                </tbody>
            </table>
            {/* Modal for Folder */}
            {showModal && (
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
            )}
            {showModalFile && (
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
            )}
        </div>
    );
};
