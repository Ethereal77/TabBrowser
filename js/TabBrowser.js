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

function renderData(searchTerm = '') {
    if (!currentData)
        return;

    const container = document.getElementById('container');
    const noResultsElem = document.getElementById('noResults');
    const searchStatsElem = document.getElementById('searchStats');
    const tabWindowCountElem = document.getElementById('tabWindowCount');

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

        // Add window header
        const windowHeader = document.createElement('div');
        windowHeader.className = 'window-header';
        windowHeader.innerHTML = `
                    <div>Window ${windowIdx} (ID: ${windowId})</div>
                    <div class="chevron">▼</div>
                `;
        windowHeader.addEventListener('click', () => {
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

            const groupHeader = document.createElement('div');
            groupHeader.className = 'group-header';
            groupHeader.innerHTML = `
                        <div>Group (ID: ${groupId})</div>
                        <div class="chevron">▼</div>
                    `;
            groupHeader.addEventListener('click', () => {
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

                    const tabElem = createTabElement(tab, false, searchTerm);
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

                const tabElem = createTabElement(tab, true, searchTerm);
                windowContent.appendChild(tabElem);
            }
        });

        // Only add the window if it has visible tabs
        if (windowHasVisibleTabs) {
            windowElem.appendChild(windowHeader);
            windowElem.appendChild(windowContent);
            container.appendChild(windowElem);

            // Auto-expand windows when searching
            if (searchTerm) {
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
    tabWindowCountElem.textContent = `Displaying ${totalTabsFound} tabs in ${windowIdx} windows`;
}

function createTabElement(tab, isStandalone = false, searchTerm = '') {
    const tabElem = document.createElement('div');
    tabElem.className = `tab ${isStandalone ? 'standalone-tab' : ''}`;

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
                <div class="tab-icon"></div>
                <div class="tab-title" title="${tab.title || 'Untitled'}">${highlightedTitle}</div>
                <div class="tab-url" title="${tab.url || ''}">${urlHtml}</div>
                <div class="timestamp">${formatTimestamp(tab.lastAccessed)}</div>
            `;

    return tabElem;
}

function validateAndLoadData() {
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

        // Use setTimeout to allow the UI to update before processing
        setTimeout(() => {
            try {
                const data = JSON.parse(jsonInput);
                progressBar.style.width = '30%';
                loadingDetails.textContent = 'Validating data structure...';

                setTimeout(() => {
                    try {
                        // Validate basic structure
                        if (!Array.isArray(data) || !data[0] || !data[0].windows) {
                            throw new Error('Invalid data format. Expected an array with a "windows" object.');
                        }

                        progressBar.style.width = '50%';
                        loadingDetails.textContent = 'Analyzing windows and tabs...';

                        setTimeout(() => {
                            try {
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

                                setTimeout(() => {
                                    // Update global data
                                    currentData = data;

                                    progressBar.style.width = '90%';
                                    loadingDetails.textContent = 'Preparing visualization...';

                                    setTimeout(() => {
                                        // Switch to visualization section
                                        document.getElementById('inputSection').style.display = 'none';
                                        document.getElementById('visualizationSection').style.display = 'block';

                                        // Render the data
                                        renderData();

                                        // Complete the progress bar
                                        progressBar.style.width = '100%';

                                        // Hide loading indicator after a small delay
                                        setTimeout(() => {
                                            loadingIndicator.style.display = 'none';
                                            // Reset progress for next time
                                            progressBar.style.width = '0%';
                                        }, 200);
                                    }, 200);
                                }, 200);
                            } catch (error) {
                                handleLoadingError(error);
                            }
                        }, 300);
                    } catch (error) {
                        handleLoadingError(error);
                    }
                }, 300);
            } catch (error) {
                handleLoadingError(error);
            }
        }, 100);
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
}

console.log('TabBrowser inicializado')
document.addEventListener('DOMContentLoaded', () => initialize());
