interface AppState {
    remoteURL?: string;
    startFS?: boolean;
    localSites?: LocalSite[];
}

interface LocalSite {
    name: string;
    expanded: boolean;
    zipped: boolean;
    info?: AppInfo;
}

interface AppInfo {
    name?: string;
    docs?: string;
}

interface MenuItemDesc {
    label: string;
    action?: () => void;
    subMenu?: MenuItemDesc[];
}

interface DownloadResult {
    success: boolean;
    file: string;
}