interface AppState {
    startURL?: string;
    startFS?: boolean;
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
