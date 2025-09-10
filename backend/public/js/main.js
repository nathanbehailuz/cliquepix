console.log("main.js loaded");

function toggleFkey() {
    const fkey = document.getElementById('fkey');
    if (fkey.style.visibility === 'hidden') {
        fkey.style.visibility = 'visible';
    } else {
        fkey.style.visibility = 'hidden';
    }
}

const imageSearchBtn = document.querySelector('.ai-image-search-btn')
imageSearchBtn.addEventListener('click', handleSearchByNames)

async function handleSearchByNames(){
    
    const imageSearchInput = document.querySelector('.ai-image-search').value
    document.querySelector('.ai-image-search').value = ''
    imageSearchBtn.disabled = true
    console.log(imageSearchInput)
    const namesList = []

    imageSearchInput
        .replace(/,/g, '') 
        .split(' ')
        .forEach(name => {
            if (name && name !== 'and') {
                namesList.push(name.toLowerCase())
            }
        })

    // send bkg post request 
    const reqQuery = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            names: namesList,
        }),
    };

    try {
        const res = await fetch(`/search-images/${namesList.join(',')}`, reqQuery)
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        console.log('Filtered images:', data);

    }
    catch (err){
        console.error('error fetching images: ', err);
    }
    finally{
        imageSearchBtn.disabled = false
    }
}


const filterDropdown = document.querySelector('.search-filter-container .filter-dropdown');
console.log("Filter dropdown element:", filterDropdown);

if (filterDropdown) {
    // Set initial value based on URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const currentFilter = urlParams.get('filterby') || 'all';
    filterDropdown.value = currentFilter;
    
    filterDropdown.addEventListener('change', (event) => {
        event.preventDefault();
        
        console.log('Change event triggered');
        console.log('Selected value:', filterDropdown.value);
        
        const selectedValue = encodeURIComponent(filterDropdown.value);
        const newUrl = `/main-page?filterby=${selectedValue}`;
        console.log('Redirecting to:', newUrl);
        
        // Only redirect if the filter actually changed
        if (selectedValue !== currentFilter) {
            window.location.href = newUrl;
        }
    });
} else {
    console.error("Filter dropdown not found!");
} 