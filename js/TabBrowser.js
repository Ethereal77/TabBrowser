import sampleData from "./SampleData.js"

// Global variable to hold the current data
let currentData = null;

function formatTimestamp(timestamp) {
    if (!timestamp)
        return '';

    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Helper function to highlight the matching text
function highlightText(text, searchTerm) {
    if (!searchTerm || !text)
        return text || '';

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// Function to check if a tab matches the search query
function tabMatchesSearch(tab, searchTerm) {
    if (!searchTerm)
        return true;

    const searchLower = searchTerm.toLowerCase();
    return (
        (tab.title && tab.title.toLowerCase().includes(searchLower)) ||
        (tab.url && tab.url.toLowerCase().includes(searchLower))
    );
}

function updateTabWindowCount(totalTabsFound, windowIdx, totalSelectedTabs) {
    const tabWindowCountElem = document.getElementById('tabWindowCount');

    tabWindowCountElem.textContent = totalSelectedTabs === 0
        ? `Displaying ${totalTabsFound} tabs in ${windowIdx} windows`
        : `Displaying ${totalTabsFound} tabs in ${windowIdx} windows (${totalSelectedTabs} selected)`;
}

function renderData(searchTerm = '') {
    // Deselect all tabs when a new search is started or modified
    selectNone();

    if (!currentData)
        return;

    const container = document.getElementById('container');
    const noResultsElem = document.getElementById('noResults');
    const searchStatsElem = document.getElementById('searchStats');

    // Clear previous content
    container.innerHTML = '';

    // Process data
    const windows = currentData[0].windows;
    let windowIdx = 0;
    let totalTabsFound = 0;
    let totalTabs = 0;

    for (const windowId in windows) {
        windowIdx++;
        const windowColorClass = `window-color-${windowIdx % 2 + 1}`;
        const tabs = windows[windowId];
        let windowHasVisibleTabs = false;

        // Create window container
        const windowElem = document.createElement('div');
        windowElem.className = `window ${windowColorClass}`;
        windowElem.setAttribute('data-window-id', windowId);

        // Add window header with checkbox and tab count
        const windowHeader = document.createElement('div');
        windowHeader.className = 'window-header';
        const tabCount = Object.keys(tabs).length;
        const tabCountText = tabCount === 1 ? '1 tab' : `${tabCount} tabs`;
        windowHeader.innerHTML = `
            <input type="checkbox" class="window-checkbox">
            <div>Window ${windowIdx} (ID: ${windowId}) <span class="tab-count">(${tabCountText})</span></div>
            <div class="chevron">▼</div>
        `;
        windowHeader.addEventListener('click', (e) => {
            if (e.target.classList.contains('window-checkbox')) return;
            const content = windowHeader.nextElementSibling;
            content.classList.toggle('collapsed');
            const chevron = windowHeader.querySelector('.chevron');
            chevron.classList.toggle('up');
        });

        // Add window content
        const windowContent = document.createElement('div');
        windowContent.className = 'window-content';

        // Process tabs by groups
        const groups = {};
        const standaloneTabIds = [];

        // Identify groups and standalone tabs
        for (const tabId in tabs) {
            const tab = tabs[tabId];
            totalTabs++;

            if (tab.groupId) {
                if (!groups[tab.groupId]) {
                    groups[tab.groupId] = [];
                }
                groups[tab.groupId].push(tabId);
            } else {
                standaloneTabIds.push(tabId);
            }
        }

        // Process groups
        let groupIdx = 0;
        for (const groupId in groups) {
            groupIdx++;
            const groupColorClass = `group-color-${groupIdx % 3 + 1}`;

            const groupElem = document.createElement('div');
            groupElem.className = `group ${groupColorClass}`;
            groupElem.setAttribute('data-group-id', groupId);

            // Add group header with checkbox
            const groupHeader = document.createElement('div');
            groupHeader.className = 'group-header';
            groupHeader.innerHTML = `
                <input type="checkbox" class="group-checkbox">
                <div>Group (ID: ${groupId})</div>
                <div class="chevron">▼</div>
            `;
            groupHeader.addEventListener('click', (e) => {
                if (e.target.classList.contains('group-checkbox')) return;
                const content = groupHeader.nextElementSibling;
                content.classList.toggle('collapsed');
                const chevron = groupHeader.querySelector('.chevron');
                chevron.classList.toggle('up');
            });

            const groupContent = document.createElement('div');
            groupContent.className = 'group-content';

            // Track if the group has any visible tabs after filtering
            let groupHasVisibleTabs = false;

            // Add tabs to group
            groups[groupId].forEach(tabId => {
                const tab = tabs[tabId];
                const isVisible = tabMatchesSearch(tab, searchTerm);

                if (isVisible) {
                    totalTabsFound++;
                    groupHasVisibleTabs = true;
                    windowHasVisibleTabs = true;

                    const tabElem = createTabElement(tab, false, searchTerm, windowId, groupId);
                    groupContent.appendChild(tabElem);
                }
            });

            // Only add the group if it has visible tabs
            if (groupHasVisibleTabs) {
                groupElem.appendChild(groupHeader);
                groupElem.appendChild(groupContent);
                windowContent.appendChild(groupElem);

                // Auto-expand groups when searching
                if (searchTerm) {
                    groupContent.classList.remove('collapsed');
                    groupHeader.querySelector('.chevron').classList.add('up');
                }
            }
        }

        // Process standalone tabs
        standaloneTabIds.forEach(tabId => {
            const tab = tabs[tabId];
            const isVisible = tabMatchesSearch(tab, searchTerm);

            if (isVisible) {
                totalTabsFound++;
                windowHasVisibleTabs = true;

                const tabElem = createTabElement(tab, true, searchTerm, windowId);
                windowContent.appendChild(tabElem);
            }
        });

        // Only add the window if it has visible tabs or no tabs at all
        if (windowHasVisibleTabs || Object.keys(tabs).length === 0) {
            windowElem.appendChild(windowHeader);
            if (windowHasVisibleTabs) {
                windowElem.appendChild(windowContent);
            } else {
                windowHeader.classList.add('muted');
            }
            container.appendChild(windowElem);

            // Auto-expand windows when searching
            if (searchTerm && windowHasVisibleTabs) {
                windowContent.classList.remove('collapsed');
                windowHeader.querySelector('.chevron').classList.add('up');
            }
        }
    }

    // Update search stats
    if (searchTerm) {
        searchStatsElem.textContent = `Found ${totalTabsFound} matching tabs out of ${totalTabs} total tabs`;
        searchStatsElem.classList.remove('hidden');
    } else {
        searchStatsElem.textContent = '';
        searchStatsElem.classList.add('hidden');
    }

    // Show no results message if needed
    if (totalTabsFound === 0 && searchTerm) {
        noResultsElem.classList.remove('hidden');
    } else {
        noResultsElem.classList.add('hidden');
    }

    // Update tab and window count
    updateTabWindowCount(totalTabsFound, windowIdx, 0);
}

function createTabElement(tab, isStandalone = false, searchTerm = '', windowId = null, groupId = null) {
    const tabElem = document.createElement('div');
    tabElem.className = `tab ${isStandalone ? 'standalone-tab' : ''}`;
    tabElem.setAttribute('data-tab-id', tab.id);
    if (windowId) tabElem.setAttribute('data-window-id', windowId);
    if (groupId) tabElem.setAttribute('data-group-id', groupId);

    // Highlight the matching text parts if there's a search term
    const highlightedTitle = highlightText(tab.title || 'Untitled', searchTerm);
    const displayUrl = tab.url ? (tab.url.length > 40 ? tab.url.substring(0, 40) + '...' : tab.url) : 'No URL';

    // Create clickable URL (without highlighting for the link element)
    let urlHtml;
    if (tab.url) {
        // Create a safe URL element
        const urlElement = document.createElement('a');
        urlElement.href = tab.url;
        urlElement.textContent = displayUrl;
        urlElement.target = "_blank";
        urlElement.rel = "noopener noreferrer";

        // If there's a search term, we need to highlight it but keep the link
        if (searchTerm) {
            // Create a temporary div to hold the highlighted URL
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = highlightText(displayUrl, searchTerm);

            // Extract the highlighted text
            const highlightedHtml = tempDiv.innerHTML;

            // Create a wrapper with the link that contains the highlighted HTML
            urlHtml = `<a href="${tab.url}" target="_blank" rel="noopener noreferrer">${highlightedHtml}</a>`;
        } else {
            // No search term, just use the link
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(urlElement);
            urlHtml = tempDiv.innerHTML;
        }
    } else {
        urlHtml = 'No URL';
    }

    tabElem.innerHTML = `
        <input type="checkbox" class="tab-checkbox">
        <div class="tab-icon"></div>
        <div class="tab-title" title="${tab.title || 'Untitled'}">${highlightedTitle}</div>
        <div class="tab-url" title="${tab.url || ''}">${urlHtml}</div>
        <div class="timestamp">${formatTimestamp(tab.lastAccessed)}</div>
    `;

    return tabElem;
}

async function validateAndLoadData() {
    const jsonInput = document.getElementById('jsonInput').value.trim();
    const errorMessageElem = document.getElementById('errorMessage');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const progressBar = document.getElementById('progressBar');
    const loadingDetails = document.getElementById('loadingDetails');

    // Clear previous error
    errorMessageElem.style.display = 'none';

    if (!jsonInput) {
        errorMessageElem.textContent = 'Please enter JSON data.';
        errorMessageElem.style.display = 'block';
        return;
    }

    try {
        // Show loading indicator
        loadingIndicator.style.display = 'block';
        progressBar.style.width = '10%';
        loadingDetails.textContent = 'Parsing JSON data...';

        await new Promise(resolve => setTimeout(resolve, 100));

        const data = JSON.parse(jsonInput);
        progressBar.style.width = '30%';
        loadingDetails.textContent = 'Validating data structure...';

        await new Promise(resolve => setTimeout(resolve, 300));

        // Validate basic structure
        if (!Array.isArray(data) || !data[0] || !data[0].windows) {
            throw new Error('Invalid data format. Expected an array with a "windows" object.');
        }

        progressBar.style.width = '50%';
        loadingDetails.textContent = 'Analyzing windows and tabs...';

        await new Promise(resolve => setTimeout(resolve, 300));

        // Count windows and tabs for stats
        const windows = data[0].windows;
        let windowCount = 0;
        let tabCount = 0;
        let groupCount = 0;
        const groups = new Set();

        for (const windowId in windows) {
            windowCount++;
            const tabs = windows[windowId];

            for (const tabId in tabs) {
                tabCount++;
                const tab = tabs[tabId];
                if (tab.groupId) {
                    groups.add(tab.groupId);
                }
            }
        }

        groupCount = groups.size;

        progressBar.style.width = '70%';
        loadingDetails.textContent = `Found ${windowCount} windows, ${groupCount} groups, and ${tabCount} tabs...`;

        await new Promise(resolve => setTimeout(resolve, 300));

        // Update global data
        currentData = data;

        progressBar.style.width = '90%';
        loadingDetails.textContent = 'Preparing visualization...';

        await new Promise(resolve => setTimeout(resolve, 200));

        // Switch to visualization section
        document.getElementById('inputSection').style.display = 'none';
        document.getElementById('visualizationSection').style.display = 'block';

        // Render the data
        renderData();

        // Complete the progress bar
        progressBar.style.width = '100%';

        // Hide loading indicator after a small delay
        await new Promise(resolve => setTimeout(resolve, 200));
        loadingIndicator.style.display = 'none';
        // Reset progress for next time
        progressBar.style.width = '0%';
    } catch (error) {
        handleLoadingError(error);
    }
}

function handleLoadingError(error) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessageElem = document.getElementById('errorMessage');

    loadingIndicator.style.display = 'none';
    errorMessageElem.textContent = `Error: ${error.message}. Please check your JSON format.`;
    errorMessageElem.style.display = 'block';
}

function loadSampleData() {
    document.getElementById('jsonInput').value = JSON.stringify(sampleData, null, 2);
}

function clearInput() {
    document.getElementById('jsonInput').value = '';
    document.getElementById('errorMessage').style.display = 'none';
}

function expandAll() {
    const collapseElements = document.querySelectorAll('.window-content, .group-content');
    const chevrons = document.querySelectorAll('.chevron');

    collapseElements.forEach(elem => {
        elem.classList.remove('collapsed');
    });

    chevrons.forEach(chevron => {
        chevron.classList.add('up');
    });
}

function collapseAll() {
    const collapseElements = document.querySelectorAll('.window-content, .group-content');
    const chevrons = document.querySelectorAll('.chevron');

    collapseElements.forEach(elem => {
        elem.classList.add('collapsed');
    });

    chevrons.forEach(chevron => {
        chevron.classList.remove('up');
    });
}

function selectAll() {
    const windowCheckboxes = document.querySelectorAll('.window-checkbox');
    windowCheckboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    const groupCheckboxes = document.querySelectorAll('.group-checkbox');
    groupCheckboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    const tabCheckboxes = document.querySelectorAll('.tab-checkbox');
    tabCheckboxes.forEach(checkbox => {
        checkbox.checked = true;
        checkbox.closest('.tab').classList.add('selected');
    });
    const totalSelectedTabs = tabCheckboxes.length;
    const totalTabsFound = document.querySelectorAll('.tab').length;
    const windowIdx = document.querySelectorAll('.window').length;
    updateTabWindowCount(totalTabsFound, windowIdx, totalSelectedTabs);
}

function selectNone() {
    const windowCheckboxes = document.querySelectorAll('.window-checkbox');
    windowCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    const groupCheckboxes = document.querySelectorAll('.group-checkbox');
    groupCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    const tabCheckboxes = document.querySelectorAll('.tab-checkbox');
    tabCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
        checkbox.closest('.tab').classList.remove('selected');
    });
    const totalTabsFound = document.querySelectorAll('.tab').length;
    const windowIdx = document.querySelectorAll('.window').length;
    updateTabWindowCount(totalTabsFound, windowIdx, 0);
}

function deleteSelectedTabs() {
    const selectedTabCheckboxes = document.querySelectorAll('.tab-checkbox:checked');
    selectedTabCheckboxes.forEach(checkbox => {
        const tabElem = checkbox.closest('.tab');
        const windowId = tabElem.getAttribute('data-window-id');
        const groupId = tabElem.getAttribute('data-group-id');
        const tabId = tabElem.getAttribute('data-tab-id');

        // Remove tab from currentData
        delete currentData[0].windows[windowId][tabId];

        // Remove tab element from DOM
        tabElem.remove();

        // If no more tabs in the group, remove the group
        if (groupId) {
            const groupElem = document.querySelector(`.group[data-group-id="${groupId}"]`);
            const groupTabs = groupElem.querySelectorAll('.tab');
            if (groupTabs.length === 0) {
                groupElem.remove();
            }
        }

        // If no more tabs in the window, remove the window
        if (windowId) {
            const windowElem = document.querySelector(`.window[data-window-id="${windowId}"]`);
            const windowTabs = windowElem.querySelectorAll('.tab');
            if (windowTabs.length === 0) {
                delete currentData[0].windows[windowId];
                windowElem.remove();
            }
        }
    });

    // Re-render data to update counts and visibility
    renderData();
}

function addNewWindow() {
    if (!currentData) {
        alert('Please load data first.');
        return;
    }

    const newWindowId = `window${Date.now()}`;
    currentData[0].windows[newWindowId] = {};
    renderData();
}

function addNewTab() {
    if (!currentData) {
        alert('Please load data first.');
        return;
    }

    const windowIds = Object.keys(currentData[0].windows);
    if (windowIds.length === 0) {
        alert('Please add a window first.');
        return;
    }

    const windowId = windowIds[0]; // Add to the first window for simplicity
    const newTabId = `tab${Date.now()}`;
    currentData[0].windows[windowId][newTabId] = {
        id: newTabId,
        index: Object.keys(currentData[0].windows[windowId]).length,
        lastAccessed: Date.now(),
        title: 'New Tab',
        url: 'about:blank'
    };
    renderData();
}

function openAddTabModal() {
    const modal = document.getElementById('addTabModal');
    const windowSelect = document.getElementById('windowSelect');
    windowSelect.innerHTML = '';

    const windowIds = Object.keys(currentData[0].windows);
    windowIds.forEach(windowId => {
        const option = document.createElement('option');
        option.value = windowId;
        option.textContent = `Window ${windowId}`;
        windowSelect.appendChild(option);
    });

    modal.classList.remove('hidden');
}

function closeAddTabModal() {
    const modal = document.getElementById('addTabModal');
    modal.classList.add('hidden');
}

function handleAddTabFormSubmit(event) {
    event.preventDefault();

    const tabName = document.getElementById('tabName').value;
    const tabUrl = document.getElementById('tabUrl').value;
    const windowId = document.getElementById('windowSelect').value;

    const newTabId = `tab${Date.now()}`;
    currentData[0].windows[windowId][newTabId] = {
        id: newTabId,
        index: Object.keys(currentData[0].windows[windowId]).length,
        lastAccessed: Date.now(),
        title: tabName,
        url: tabUrl
    };

    closeAddTabModal();
    renderData();
}

// Initialize
function initialize() {
    // Set up button handlers
    document.getElementById('loadBtn').addEventListener('click', validateAndLoadData);
    document.getElementById('loadSampleBtn').addEventListener('click', loadSampleData);
    document.getElementById('clearBtn').addEventListener('click', clearInput);
    document.getElementById('backToInput').addEventListener('click', () => {
        document.getElementById('inputSection').style.display = 'block';
        document.getElementById('visualizationSection').style.display = 'none';
    });
    document.getElementById('expandAllBtn').addEventListener('click', expandAll);
    document.getElementById('collapseAllBtn').addEventListener('click', collapseAll);
    document.getElementById('selectAllBtn').addEventListener('click', selectAll);
    document.getElementById('selectNoneBtn').addEventListener('click', selectNone);
    document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedTabs);
    document.getElementById('addWindowBtn').addEventListener('click', addNewWindow);
    document.getElementById('addTabBtn').addEventListener('click', openAddTabModal);
    document.getElementById('closeAddTabModal').addEventListener('click', closeAddTabModal);
    document.getElementById('addTabForm').addEventListener('submit', handleAddTabFormSubmit);

    // Set up search functionality
    const searchBar = document.getElementById('searchBar');

    searchBar.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        renderData(searchTerm);
    });

    // Clear search when pressing Escape
    searchBar.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchBar.value = '';
            renderData();
        }
    });

    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('window-checkbox')) {
            const windowId = e.target.closest('.window').dataset.windowId;
            const checked = e.target.checked;
            document.querySelectorAll(`.window[data-window-id="${windowId}"] .group-checkbox`).forEach(checkbox => {
                checkbox.checked = checked;
            });
            document.querySelectorAll(`.tab[data-window-id="${windowId}"] .tab-checkbox`).forEach(checkbox => {
                checkbox.checked = checked;
                checkbox.closest('.tab').classList.toggle('selected', checked);
            });
        } else if (e.target.classList.contains('group-checkbox')) {
            const groupId = e.target.closest('.group').dataset.groupId;
            const checked = e.target.checked;
            document.querySelectorAll(`.tab[data-group-id="${groupId}"] .tab-checkbox`).forEach(checkbox => {
                checkbox.checked = checked;
                checkbox.closest('.tab').classList.toggle('selected', checked);
            });
        } else if (e.target.classList.contains('tab-checkbox')) {
            const checked = e.target.checked;
            e.target.closest('.tab').classList.toggle('selected', checked);
        }

        const totalSelectedTabs = document.querySelectorAll('.tab-checkbox:checked').length;
        const totalTabsFound = document.querySelectorAll('.tab').length;
        const windowIdx = document.querySelectorAll('.window').length;
        updateTabWindowCount(totalTabsFound, windowIdx, totalSelectedTabs);
    });
}

console.log('TabBrowser inicializado')
document.addEventListener('DOMContentLoaded', () => initialize());
