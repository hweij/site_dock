interface AppState {
    startURL?: string;
    localSites?: LocalSite[];
}

interface LocalSite {
    name: string;
    expanded: boolean;
    zipped: boolean;
}

interface MenuItemDesc {
    label: string;
    action?: () => void;
    subMenu?: MenuItemDesc[];
}
