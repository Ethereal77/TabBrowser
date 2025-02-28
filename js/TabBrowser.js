import sampleData from "./SampleData.js"

// Global variable to hold the current data
let currentData = null


// ----------------- Load Data -----------------

const inputSection = document.getElementById('inputSection')

const jsonInputElem = document.getElementById('jsonInput')
const errorMessageElem = document.getElementById('errorMessage')
const loadingIndicator = document.getElementById('loadingIndicator')
const progressBar = document.getElementById('progressBar')
const loadingDetails = document.getElementById('loadingDetails')

/**
 * Initializes the input data form and loading functionality.
 */
function initializeInputData() {

    document.getElementById('loadBtn').addEventListener('click', validateAndLoadData)
    document.getElementById('loadSampleBtn').addEventListener('click', loadSampleData)
    document.getElementById('clearBtn').addEventListener('click', clearInput)
    document.getElementById('loadFileBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click()
    })
    document.getElementById('fileInput').addEventListener('change', handleFileLoad)
}

/**
 * Validates the JSON input and loads the data if it's correct. Shows a progress bar
 * indicating the progress of the loading process, and displays an error message if needed.
 */
async function validateAndLoadData() {

    const jsonInput = jsonInputElem.value.trim()

    // Clear previous error
    errorMessageElem.style.display = 'none'

    if (!jsonInput) {
        errorMessageElem.textContent = 'Please enter JSON data.'
        errorMessageElem.style.display = 'block'
        return
    }

    try {
        // Show loading indicator
        loadingIndicator.style.display = 'block'
        progressBar.style.width = '10%'
        loadingDetails.textContent = 'Parsing JSON data...'

        await new Promise(resolve => setTimeout(resolve, 100))

        const data = JSON.parse(jsonInput)
        progressBar.style.width = '30%'
        loadingDetails.textContent = 'Validating data structure...'

        await new Promise(resolve => setTimeout(resolve, 300))

        // Validate basic structure
        if (!Array.isArray(data) || !data[0] || !data[0].windows) {
            throw new Error('Invalid data format. Expected an array with a "windows" object.')
        }

        progressBar.style.width = '50%'
        loadingDetails.textContent = 'Analyzing windows and tabs...'

        await new Promise(resolve => setTimeout(resolve, 300))

        // Count windows and tabs for stats
        const windows = data[0].windows
        let windowCount = 0
        let tabCount = 0
        let groupCount = 0
        const groups = new Set()

        for (const windowId in windows) {
            windowCount++
            const tabs = windows[windowId]

            for (const tabId in tabs) {
                tabCount++
                const tab = tabs[tabId]
                if (tab.groupId) {
                    groups.add(tab.groupId)
                }
            }
        }

        groupCount = groups.size

        progressBar.style.width = '70%'
        loadingDetails.textContent = `Found ${windowCount} windows, ${groupCount} groups, and ${tabCount} tabs...`

        await new Promise(resolve => setTimeout(resolve, 300))

        // Update global data
        currentData = data

        progressBar.style.width = '90%'
        loadingDetails.textContent = 'Preparing visualization...'

        await new Promise(resolve => setTimeout(resolve, 200))

        // Switch to visualization section
        inputSection.style.display = 'none'
        visualizationSection.style.display = 'block'

        // Render the data
        renderData()

        // Complete the progress bar
        progressBar.style.width = '100%'

        // Hide loading indicator after a small delay
        await new Promise(resolve => setTimeout(resolve, 500))
        loadingIndicator.style.display = 'none'

        // Reset progress for next time
        progressBar.style.width = '0%'

        // Remove input text for next time
        clearInput()

    } catch (error) {
        handleLoadingError(error)
    }
}

/**
 * Handles any loading errors by displaying an error message.
 *
 * @param {Error} error The loading error information.
 */
function handleLoadingError(error) {

    console.warn('Error:', error.message)

    loadingIndicator.style.display = 'none'
    errorMessageElem.textContent = `Error: ${error.message}. Please check your JSON format.`
    errorMessageElem.style.display = 'block'
}

/**
 * Loads the sample data into the input field.
 */
function loadSampleData() {
    jsonInputElem.value = JSON.stringify(sampleData, null, 2)
}

/**
 * Clears the input field and hides any error messages.
 */
function clearInput() {
    jsonInputElem.value = ''
    errorMessageElem.style.display = 'none'
}

/**
 * Loads a JSON file as input data. Used by `loadFileBtn`.
 *
 * @param {Event} event The file change event.
 */
function handleFileLoad(event) {

    const file = event.target.files[0]
    if (!file)
        return

    const reader = new FileReader()
    reader.onload = function (e) {
        const content = e.target.result
        jsonInputElem.value = content
    }
    reader.readAsText(file)
}

// ----------------- Render Data -----------------

const visualizationSection = document.getElementById('visualizationSection')

const container = document.getElementById('container')
const noResultsElem = document.getElementById('noResults')
const tabWindowCountElem = document.getElementById('tabWindowCount')

/**
 * Initializes the windows, groups, and tabs visualization functionality.
 */
function initializeVisualization() {

    document.getElementById('backToInput').addEventListener('click', backToInput)

    document.getElementById('expandAllBtn').addEventListener('click', expandAll)
    document.getElementById('collapseAllBtn').addEventListener('click', collapseAll)

    document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedTabs)

    initializeSearch()
    initializeTabSelection()

    initializeAddWindow()
    initializeAddTab()

    initializeShowData()
}

/**
 * Renders the data in the interface. If a search term is provided, it filters the data accordingly.
 *
 * @param {string} searchTerm The search term to filter the data. Defaults to an empty string.
 */
function renderData(searchTerm = '') {

    // Deselect all tabs when a new search is started or modified
    selectNone()

    if (!currentData)
        return

    // Clear previous content
    container.innerHTML = ''

    // Process data
    const windows = currentData[0].windows
    let windowIdx = 0
    let totalTabsFound = 0
    let totalTabs = 0

    for (const windowId in windows) {
        windowIdx++
        const windowColorClass = `window-color-${windowIdx % 2 + 1}`
        const tabs = windows[windowId]
        let windowHasVisibleTabs = false

        // Create window container
        const windowElem = document.createElement('div')
        windowElem.className = `window ${windowColorClass}`
        windowElem.setAttribute('data-window-id', windowId)

        // Add window header with checkbox and tab count
        const windowHeader = document.createElement('div')
        windowHeader.className = 'window-header'
        const tabCount = Object.keys(tabs).length
        const tabCountText = tabCount === 1 ? '1 tab' : `${tabCount} tabs`
        windowHeader.innerHTML = `
            <input type="checkbox" class="window-checkbox">
            <div>Window ${windowIdx} (ID: ${windowId}) <span class="tab-count">(${tabCountText})</span></div>
            <div class="chevron">▼</div>
        `
        windowHeader.addEventListener('click', (e) => {
            if (e.target.classList.contains('window-checkbox'))
                return

            const content = windowHeader.nextElementSibling
            content.classList.toggle('collapsed')
            const chevron = windowHeader.querySelector('.chevron')
            chevron.classList.toggle('up')
        })

        // Add window content
        const windowContent = document.createElement('div')
        windowContent.className = 'window-content'

        // Process tabs by groups
        const groups = {}
        const nonGroupedTabIds = []

        // Identify groups and non-grouped tabs
        for (const tabId in tabs) {
            const tab = tabs[tabId]
            totalTabs++

            if (tab.groupId) {
                if (!groups[tab.groupId]) {
                    groups[tab.groupId] = []
                }
                groups[tab.groupId].push(tabId)
            } else {
                nonGroupedTabIds.push(tabId)
            }
        }

        // Process groups
        let groupIdx = 0
        for (const groupId in groups) {
            groupIdx++
            const groupColorClass = `group-color-${groupIdx % 3 + 1}`

            const groupElem = document.createElement('div')
            groupElem.className = `group ${groupColorClass}`
            groupElem.setAttribute('data-group-id', groupId)

            // Add group header with checkbox
            const groupHeader = document.createElement('div')
            groupHeader.className = 'group-header'
            groupHeader.innerHTML = `
                <input type="checkbox" class="group-checkbox">
                <div>Group (ID: ${groupId})</div>
                <div class="chevron">▼</div>
            `
            groupHeader.addEventListener('click', (e) => {
                if (e.target.classList.contains('group-checkbox'))
                    return

                const content = groupHeader.nextElementSibling
                content.classList.toggle('collapsed')
                const chevron = groupHeader.querySelector('.chevron')
                chevron.classList.toggle('up')
            })

            const groupContent = document.createElement('div')
            groupContent.className = 'group-content'

            // Track if the group has any visible tabs after filtering
            let groupHasVisibleTabs = false

            // Add tabs to group
            groups[groupId].forEach(tabId => {
                const tab = tabs[tabId]
                const isVisible = tabMatchesSearch(tab, searchTerm)

                if (isVisible) {
                    totalTabsFound++
                    groupHasVisibleTabs = true
                    windowHasVisibleTabs = true

                    const tabElem = createTabElement(tab, false, searchTerm, windowId, groupId)
                    groupContent.appendChild(tabElem)
                }
            })

            // Only add the group if it has visible tabs
            if (groupHasVisibleTabs) {
                groupElem.appendChild(groupHeader)
                groupElem.appendChild(groupContent)
                windowContent.appendChild(groupElem)

                // Auto-expand groups when searching
                if (searchTerm) {
                    groupContent.classList.remove('collapsed')
                    groupHeader.querySelector('.chevron').classList.add('up')
                }
            }
        }

        // Process non-grouped tabs
        nonGroupedTabIds.forEach(tabId => {
            const tab = tabs[tabId]
            const isVisible = tabMatchesSearch(tab, searchTerm)

            if (isVisible) {
                totalTabsFound++
                windowHasVisibleTabs = true

                const tabElem = createTabElement(tab, true, searchTerm, windowId)
                windowContent.appendChild(tabElem)
            }
        })

        // Only add the window if it has visible tabs or no tabs at all
        if (windowHasVisibleTabs || Object.keys(tabs).length === 0) {
            windowElem.appendChild(windowHeader)

            if (windowHasVisibleTabs) {
                windowElem.appendChild(windowContent)
            } else {
                windowHeader.classList.add('muted')
            }
            container.appendChild(windowElem)

            // Auto-expand windows when searching
            if (searchTerm && windowHasVisibleTabs) {
                windowContent.classList.remove('collapsed')
                windowHeader.querySelector('.chevron').classList.add('up')
            }
        }
    }

    // Update search stats
    updateSearchStats(searchTerm, totalTabs, totalTabsFound)

    // Show no results message if needed
    if (totalTabsFound === 0 && searchTerm) {
        noResultsElem.classList.remove('hidden')
    } else {
        noResultsElem.classList.add('hidden')
    }

    // Update tab and window count
    updateTabWindowCount(totalTabsFound, windowIdx, 0)
}

/**
 * Updates the tab and window count display. Also shows the number of selected tabs, if any.
 *
 * @param {number} totalTabs Total number of tabs displayed.
 * @param {number} totalWindows Total number of windows.
 * @param {number} totalSelectedTabs Total number of selected tabs.
 */
function updateTabWindowCount(totalTabs, totalWindows, totalSelectedTabs) {

    const tabCountText = totalTabs === 1 ? `1 tab` : `${totalTabs} tabs`
    const windowCountText = totalWindows === 1 ? `1 window` : `${totalWindows} windows`

    tabWindowCountElem.textContent = totalSelectedTabs === 0
        ? `Displaying ${tabCountText} in ${windowCountText}`
        : `Displaying ${tabCountText} in ${windowCountText} (${totalSelectedTabs} selected)`
}

/**
 * Creates a new element for a tab with the given data.
 *
 * @param {Object} tab The tab data object.
 * @param {boolean} isNonGrouped Whether the tab is not part of a group.
 * @param {string} searchTerm The search term to highlight.
 * @param {string} windowId The ID of the window the tab belongs to.
 * @param {string | null} groupId The ID of the group the tab belongs to. Can be `null`.
 *
 * @returns {HTMLElement} The created tab element.
 */
function createTabElement(tab, isNonGrouped = false, searchTerm = '', windowId = null, groupId = null) {

    const tabElem = document.createElement('div')
    tabElem.className = `tab ${isNonGrouped ? 'non-grouped-tab' : ''}`

    tabElem.setAttribute('data-tab-id', tab.id)
    if (windowId)
        tabElem.setAttribute('data-window-id', windowId)
    if (groupId)
        tabElem.setAttribute('data-group-id', groupId)

    // Highlight the matching text parts if there's a search term
    const highlightedTitle = highlightText(tab.title || 'Untitled', searchTerm)
    const displayUrl = tab.url ? (tab.url.length > 40 ? tab.url.substring(0, 40) + '...' : tab.url) : 'No URL'

    // Create clickable URL (without highlighting for the link element)
    let urlHtml
    if (tab.url) {
        // Create a safe URL element
        const urlElement = document.createElement('a')
        urlElement.href = tab.url
        urlElement.textContent = displayUrl
        urlElement.target = "_blank"
        urlElement.rel = "noopener noreferrer"

        // If there's a search term, we need to highlight it but keep the link
        if (searchTerm) {
            // Create a temporary div to hold the highlighted URL
            const tempDiv = document.createElement('div')
            tempDiv.innerHTML = highlightText(displayUrl, searchTerm)

            // Extract the highlighted text
            const highlightedHtml = tempDiv.innerHTML

            // Create a wrapper with the link that contains the highlighted HTML
            urlHtml = `<a href="${tab.url}" target="_blank" rel="noopener noreferrer">${highlightedHtml}</a>`
        } else {
            // No search term, just use the link
            const tempDiv = document.createElement('div')
            tempDiv.appendChild(urlElement)
            urlHtml = tempDiv.innerHTML
        }
    } else {
        urlHtml = 'No URL'
    }

    tabElem.innerHTML = `
        <input type="checkbox" class="tab-checkbox">
        <div class="tab-icon"></div>
        <div class="tab-title" title="${tab.title || 'Untitled'}">${highlightedTitle}</div>
        <div class="tab-url" title="${tab.url || ''}">${urlHtml}</div>
        <div class="timestamp">${formatTimestamp(tab.lastAccessed)}</div>
    `

    return tabElem
}

/**
 * Formats a timestamp as a human-readable date and time string.
 *
 * @param {string} timestamp A `string` representing a timestamp.
 *
 * @returns A human-friendly date and time representation of the timestamp.
 */
function formatTimestamp(timestamp) {

    if (!timestamp)
        return ''

    const date = new Date(timestamp)
    return date.toLocaleString()
}

/**
 * Hides the visualization section and goes back to the input data section.
 */
function backToInput() {

    // Clears any search prior to abandoning this view
    cancelSearch()

    inputSection.style.display = 'block'
    visualizationSection.style.display = 'none'
}

// ----------------- Search -----------------

const searchBar = document.getElementById('searchBar')

const searchStatsElem = document.getElementById('searchStats')

/**
 * Initializes the search functionality.
 */
function initializeSearch() {

    searchBar.addEventListener('input', updateSearch)

    // Clear search when pressing Escape
    searchBar.addEventListener('keydown', e => {

        if (e.key === 'Escape')
            cancelSearch()
    })
}

/**
 * Updates the search term and re-renders the interface to highlight any matches.
 *
 * @param {KeyboardEvent} inputEvent Event data of the keypress.
 */
function updateSearch(inputEvent) {
    const searchTerm = inputEvent.target.value.trim()
    renderData(searchTerm)
}

/**
 * Cancels the current search, clearing the search field and re-rendering the data.
 */
function cancelSearch() {
    searchBar.value = ''
    renderData()
}

/**
 * Updates the message about search total matches.
 *
 * @param {string | null} searchTerm The search term, or `null` if no search.
 * @param {number} totalTabs Total number of tabs.
 * @param {number} totalTabsFound Total number of tabs matching the search term.
 */
function updateSearchStats(searchTerm, totalTabs, totalTabsFound) {
    if (searchTerm) {
        searchStatsElem.textContent = `Found ${totalTabsFound} matching tabs out of ${totalTabs} total tabs`
        searchStatsElem.classList.remove('hidden')
    } else {
        searchStatsElem.textContent = ''
        searchStatsElem.classList.add('hidden')
    }
}

/**
 * Highlights the search term in the given text.
 *
 * @param {string} text The text to search for the search term.
 * @param {string} searchTerm The text to search.
 *
 * @returns A `string` that represents the text as is if no match, or a highlighted `<span>` element if
 *          the search term is found.
 */
function highlightText(text, searchTerm) {

    if (!searchTerm || !text)
        return text || ''

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.replace(regex, '<span class="highlight">$1</span>')
}

/**
 * Checks if a tab matches the search term. If no search term is provided, it always returns `true`.
 *
 * @param {object} tab The tab data object.
 * @param {string} searchTerm The search term to match against the tab title or URL.
 *
 * @returns `true` if the tab matches the search term in the title or in the URL, or if no search term; `false` otherwise.
 */
function tabMatchesSearch(tab, searchTerm) {

    if (!searchTerm)
        return true

    const searchLower = searchTerm.toLowerCase()
    return (
        (tab.title && tab.title.toLowerCase().includes(searchLower)) ||
        (tab.url && tab.url.toLowerCase().includes(searchLower))
    )
}

// ----------------- Expand / Collapse Tabs -----------------

/**
 * Expands all the windows and groups.
 */
function expandAll() {
    const collapseElements = document.querySelectorAll('.window-content, .group-content')
    const chevrons = document.querySelectorAll('.chevron')

    collapseElements.forEach(elem => elem.classList.remove('collapsed'))

    chevrons.forEach(chevron => chevron.classList.add('up'))
}

/**
 * Collapses all the windows and groups.
 */
function collapseAll() {
    const collapseElements = document.querySelectorAll('.window-content, .group-content')
    const chevrons = document.querySelectorAll('.chevron')

    collapseElements.forEach(elem => elem.classList.add('collapsed'))

    chevrons.forEach(chevron => chevron.classList.remove('up'))
}

// ----------------- Select Tabs -----------------

/**
 * Initializes the windows, groups, and tabs selection functionality.
 */
function initializeTabSelection() {

    document.getElementById('selectAllBtn').addEventListener('click', selectAll)
    document.getElementById('selectNoneBtn').addEventListener('click', selectNone)

    // Listen to any `change` event in the document and consider it only if it's on a window, group, or tab checkbox.
    // This is done this way as there may be a lot of tabs and adding event listeners individually would be
    // a lot of event listeners
    document.addEventListener('change', (e) => {

        if (e.target.classList.contains('window-checkbox')) {

            const windowId = e.target.closest('.window').dataset.windowId
            selectWindow(windowId, e.target.checked)

        } else if (e.target.classList.contains('group-checkbox')) {

            const groupId = e.target.closest('.group').dataset.groupId
            selectGroup(groupId, e.target.checked)

        } else if (e.target.classList.contains('tab-checkbox')) {

            e.target.closest('.tab').classList.toggle('selected', e.target.checked)
        }

        const totalSelectedTabs = document.querySelectorAll('.tab-checkbox:checked').length
        const totalTabsFound = document.querySelectorAll('.tab').length
        const windowIdx = document.querySelectorAll('.window').length
        updateTabWindowCount(totalTabsFound, windowIdx, totalSelectedTabs)
    })
}

/**
 * Selects all the tabs. Also selects the corresponding group and window checkboxes.
 */
function selectAll() {

    const windowCheckboxes = document.querySelectorAll('.window-checkbox')
    windowCheckboxes.forEach(checkbox => checkbox.checked = true)

    const groupCheckboxes = document.querySelectorAll('.group-checkbox')
    groupCheckboxes.forEach(checkbox => checkbox.checked = true)

    const tabCheckboxes = document.querySelectorAll('.tab-checkbox')
    tabCheckboxes.forEach(checkbox => {
        checkbox.checked = true
        checkbox.closest('.tab').classList.add('selected')
    })

    const totalSelectedTabs = tabCheckboxes.length
    const totalTabsFound = document.querySelectorAll('.tab').length
    const windowIdx = document.querySelectorAll('.window').length
    updateTabWindowCount(totalTabsFound, windowIdx, totalSelectedTabs)
}

/**
 * Deselects all the tabs. Also deselects the corresponding group and window checkboxes.
 */
function selectNone() {

    const windowCheckboxes = document.querySelectorAll('.window-checkbox')
    windowCheckboxes.forEach(checkbox => checkbox.checked = false)

    const groupCheckboxes = document.querySelectorAll('.group-checkbox')
    groupCheckboxes.forEach(checkbox => checkbox.checked = false)

    const tabCheckboxes = document.querySelectorAll('.tab-checkbox')
    tabCheckboxes.forEach(checkbox => {
        checkbox.checked = false
        checkbox.closest('.tab').classList.remove('selected')
    })

    const totalTabsFound = document.querySelectorAll('.tab').length
    const windowIdx = document.querySelectorAll('.window').length
    updateTabWindowCount(totalTabsFound, windowIdx, 0)
}

/**
 * Selects or deselects a window, its groups, and all its tabs.
 *
 * @param {string} windowId The Id of the window whose tabs must be selected.
 * @param {boolean} selected A value indicating if the window was selected or deselected.
 */
function selectWindow(windowId, selected) {

    const groupsInWindow = document.querySelectorAll(`.window[data-window-id="${windowId}"] .group-checkbox`)
    groupsInWindow.forEach(checkbox => checkbox.checked = selected)

    const tabsInWindow = document.querySelectorAll(`.tab[data-window-id="${windowId}"] .tab-checkbox`)
    tabsInWindow.forEach(checkbox => {
        checkbox.checked = selected
        checkbox.closest('.tab').classList.toggle('selected', selected)
    })
}

/**
 * Selects or deselects a group and all its tabs.
 *
 * @param {string} groupId The Id of the group whose tabs must be selected.
 * @param {boolean} selected A value indicating if the group was selected or deselected.
 */
function selectGroup(groupId, selected) {

    const tabsInGroup = document.querySelectorAll(`.tab[data-group-id="${groupId}"] .tab-checkbox`)
    tabsInGroup.forEach(checkbox => {
        checkbox.checked = selected
        checkbox.closest('.tab').classList.toggle('selected', selected)
    })
}

// ----------------- Delete Tabs -----------------

/**
 * Goes through the tabs marked (with the checkbox) and deletes them from the
 * interface and from the data. It also removes groups and windows if they are empty.
 */
function deleteSelectedTabs() {

    const selectedTabCheckboxes = document.querySelectorAll('.tab-checkbox:checked')
    selectedTabCheckboxes.forEach(checkbox => {
        const tabElem = checkbox.closest('.tab')
        const windowId = tabElem.getAttribute('data-window-id')
        const groupId = tabElem.getAttribute('data-group-id')
        const tabId = tabElem.getAttribute('data-tab-id')

        // Remove tab from currentData
        delete currentData[0].windows[windowId][tabId]

        // Remove tab element from DOM
        tabElem.remove()

        // If no more tabs in the group, remove the group
        if (groupId) {
            const groupElem = document.querySelector(`.group[data-group-id="${groupId}"]`)
            const groupTabs = groupElem.querySelectorAll('.tab')
            if (groupTabs.length === 0) {
                groupElem.remove()
            }
        }

        // If no more tabs in the window, remove the window
        if (windowId) {
            const windowElem = document.querySelector(`.window[data-window-id="${windowId}"]`)
            const windowTabs = windowElem.querySelectorAll('.tab')
            if (windowTabs.length === 0) {
                delete currentData[0].windows[windowId]
                windowElem.remove()
            }
        }
    })

    // Re-render data to update counts and visibility
    renderData()
}

// ----------------- Add Window -----------------

/**
 * Initializes the "Add New Window" functionality.
 */
function initializeAddWindow() {
    document.getElementById('addWindowBtn').addEventListener('click', addNewWindow)
}

/**
 * Adds a new empty window.
 */
function addNewWindow() {

    if (!currentData) {
        alert('Please load data first.')
        return
    }

    const newWindowId = `window-${Date.now()}`
    currentData[0].windows[newWindowId] = {}

    renderData()
}

// ----------------- Add Tabs -----------------

const addTabModal = document.getElementById('addTabModal')

const addTabWindowSelect = document.getElementById('windowSelect')
const addTabNameInput = document.getElementById('tabName')
const addTabUrlInput = document.getElementById('tabUrl')

/**
 * Initializes the "Add New Tab" dialog functionality.
 */
function initializeAddTab() {
    document.getElementById('addTabBtn').addEventListener('click', openAddTabModal)

    document.getElementById('closeAddTabModal').addEventListener('click', closeAddTabModal)
    document.getElementById('addTabForm').addEventListener('submit', handleAddTabFormSubmit)
}

/**
 * Opens the modal dialog to add a new tab to a window.
 */
function openAddTabModal() {

    addTabWindowSelect.innerHTML = ''

    const windowIds = Object.keys(currentData[0].windows)
    windowIds.forEach(windowId => {
        const option = document.createElement('option')
        option.value = windowId
        option.textContent = `Window ${windowId}`
        addTabWindowSelect.appendChild(option)
    })

    addTabModal.classList.remove('hidden')
}

/**
 * Closes the modal dialog to add a new tab to a window.
 */
function closeAddTabModal() {
    addTabModal.classList.add('hidden')
}

/**
 * Handles the creation of a new tab when the user accepts.
 *
 * @param {SubmitEvent} event The "Add Tab" form submit event.
 */
function handleAddTabFormSubmit(event) {
    event.preventDefault()

    const windowId = addTabWindowSelect.value

    const newTabId = `tab${Date.now()}`
    currentData[0].windows[windowId][newTabId] = {
        id: newTabId,
        index: Object.keys(currentData[0].windows[windowId]).length,
        lastAccessed: Date.now(),
        title: addTabNameInput.value,
        url: addTabUrlInput.value
    }

    // Clears the form and closes the modal
    closeAddTabModal()

    addTabNameInput.value = ''
    addTabUrlInput.value = ''
    addTabWindowSelect.value = ''

    renderData()
}

// ----------------- JSON Data Display -----------------

const jsonDataModal = document.getElementById('jsonDataModal')
const jsonDataOutput = document.getElementById('jsonDataOutput')

/**
 * Initializes the modal dialog that shows the current data as JSON and related functionality.
 */
function initializeShowData() {
    document.getElementById('showJsonBtn').addEventListener('click', showJsonData)
    document.getElementById('closeJsonModal').addEventListener('click', closeJsonData)
    document.getElementById('copyJsonBtn').addEventListener('click', copyJsonData)
    document.getElementById('downloadJsonBtn').addEventListener('click', downloadJsonData)
}

/**
 * Shows a modal dialog where the user can see the data as JSON.
 */
function showJsonData() {

    if (!currentData) {
        alert('No data to display.')
        return
    }

    jsonDataOutput.value = JSON.stringify(currentData, null, 2)

    jsonDataModal.classList.remove('hidden')
}

/**
 * Closes the modal dialog where the user can see the data as JSON.
 */
function closeJsonData() {
    jsonDataModal.classList.add('hidden')
}

async function copyJsonData() {
    try {
        await navigator.clipboard.writeText(jsonDataOutput.value)
        alert('JSON data copied to clipboard.')

    } catch (error) {
        console.error('Failed to copy text: ', error)
    }
}

/**
 * Downloads the current data as JSON.
 */
function downloadJsonData() {

    if (!currentData) {
        alert('No data to download.')
        return
    }

    const jsonData = JSON.stringify(currentData, null, 2)
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    a.download = `browser_tabs_${timestamp}.json`

    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    URL.revokeObjectURL(url)
}

// ----------------- Initialization -----------------

// Initialize
function initialize() {

    initializeInputData()
    initializeVisualization()
}

console.log('TabBrowser inicializado')
document.addEventListener('DOMContentLoaded', () => initialize())
