// État global de l'application
const appState = {
    currentStep: 1,
    selectedService: null,
    selectedDate: null,
    selectedTime: null,
    selectedDuration: 0,
    selectedPrice: 0,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    bookings: [],
    csrfToken: null,
    csrfTokenExpires: null,
    closedDays: JSON.parse(localStorage.getItem('closedDays')) || [],
    businessHours: JSON.parse(localStorage.getItem('businessHours')) || {
        sunday: { open: '09:00', close: '19:00', closed: false },
        monday: { open: '09:00', close: '19:00', closed: false },
        tuesday: { open: '09:00', close: '19:00', closed: false },
        wednesday: { open: '09:00', close: '19:00', closed: false },
        thursday: { open: '09:00', close: '19:00', closed: false },
        friday: { open: '09:00', close: '19:00', closed: true },
        saturday: { open: '09:00', close: '18:00', closed: false }
    }
};

async function loadBookingsFromDatabase() {
    try {
        const bookings = await BookingAPI.getBookings();
        appState.bookings = bookings.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
        console.log(`Chargé ${appState.bookings.length} réservations depuis l'API`);
        
        // Rafraîchir le calendrier avec les nouvelles données
        if (appState.currentStep === 2) {
            renderCalendar();
        }
    } catch (error) {
        console.warn('Impossible de charger depuis l\'API, les réservations ne sont pas conservées localement', error);
        appState.bookings = [];
    }
}

// Charger Firebase en arrière-plan sans bloquer l'interface
async function loadBookingsFromDatabaseAsync() {
    // Attendre que Firebase soit prêt, puis charger
    setTimeout(async () => {
        await loadBookingsFromDatabase();
    }, 0);
}

async function saveBookingToDatabase(booking) {
    try {
        const csrfToken = await ensureCsrfToken();
        await BookingAPI.createBooking(booking, csrfToken);
        console.log('Réservation enregistrée:', booking.id);
    } catch (error) {
        console.error('Erreur d\'enregistrement:', error);
        throw error;
    }
}

async function deleteBookingFromDatabase(id, adminToken) {
    try {
        const csrfToken = await ensureCsrfToken();
        await BookingAPI.deleteBooking(id, adminToken, csrfToken);
        console.log('Réservation supprimée:', id);
    } catch (error) {
        console.error('Erreur de suppression:', error);
        throw error;
    }
}

const serviceNames = {
    'visage': 'Soins du Visage',
    'corporel': 'Soins Corporels',
    'manucure': 'Manucure & Pédicure',
    'epilation': 'Épilation',
    'maquillage': 'Maquillage Professionnel',
    'antiage': 'Soins Anti-Âge'
};

function escapeHTML(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function loadCsrfToken() {
    try {
        const tokenData = await BookingAPI.getCsrfToken();
        appState.csrfToken = tokenData.token;
        appState.csrfTokenExpires = Date.now() + (tokenData.expiresIn * 1000);
        sessionStorage.setItem('csrfToken', tokenData.token);
        sessionStorage.setItem('csrfTokenExpires', appState.csrfTokenExpires.toString());
        return tokenData.token;
    } catch (error) {
        console.error('Erreur chargement CSRF token:', error);
        appState.csrfToken = null;
        appState.csrfTokenExpires = null;
        return null;
    }
}

function getStoredCsrfToken() {
    const storedToken = sessionStorage.getItem('csrfToken');
    const storedExpires = Number(sessionStorage.getItem('csrfTokenExpires'));
    if (storedToken && storedExpires && Date.now() < storedExpires) {
        return storedToken;
    }
    return null;
}

async function ensureCsrfToken() {
    const existingToken = getStoredCsrfToken();
    if (existingToken) {
        appState.csrfToken = existingToken;
        appState.csrfTokenExpires = Number(sessionStorage.getItem('csrfTokenExpires'));
        return existingToken;
    }
    return await loadCsrfToken();
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    // Chargement immédiat sans attendre Firebase
    initializeBookingSystem();
    initializeCalendar();
    
    // Charger le token CSRF et les réservations Firebase en arrière-plan
    ensureCsrfToken();
    loadBookingsFromDatabaseAsync();
});

function initializeBookingSystem() {
    // Service selection
    document.querySelectorAll('.service-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.service-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            
            appState.selectedService = this.dataset.service;
            appState.selectedDuration = parseInt(this.dataset.duration);
            appState.selectedPrice = parseInt(this.dataset.price);
            
            document.querySelector('#step-1 .btn-next').disabled = false;
        });
    });
}

function initializeCalendar() {
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const firstDay = new Date(appState.currentYear, appState.currentMonth, 1);
    const lastDay = new Date(appState.currentYear, appState.currentMonth + 1, 0);
    const prevLastDay = new Date(appState.currentYear, appState.currentMonth, 0);
    
    const firstDayIndex = firstDay.getDay();
    const lastDayIndex = lastDay.getDay();
    const nextDays = 7 - lastDayIndex - 1;
    
    // Update month display
    const monthEl = document.getElementById('current-month');
    if (monthEl) {
        const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                       'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        monthEl.textContent = `${months[appState.currentMonth]} ${appState.currentYear}`;
    }
    
    // Previous month days
    for (let x = firstDayIndex; x > 0; x--) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = prevLastDay.getDate() - x + 1;
        grid.appendChild(day);
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day';
        day.textContent = i;
        
        const currentDate = new Date(appState.currentYear, appState.currentMonth, i);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Check if today
        if (currentDate.toDateString() === today.toDateString()) {
            day.classList.add('today');
        }
        
        // Check if in the past
        if (currentDate < today) {
            day.classList.add('disabled');
        }
        
        // Check if closed day
        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentDate.getDay()];
        if (appState.businessHours[dayOfWeek].closed) {
            day.classList.add('disabled');
        }
        
        // Check if in closed days list
        const dateStr = formatDate(currentDate);
        if (appState.closedDays.find(cd => cd.date === dateStr)) {
            day.classList.add('disabled');
        }
        
        // Check if has bookings
        if (appState.bookings.find(b => b.date === dateStr)) {
            day.classList.add('has-bookings');
        }
        
        // Add click handler
        if (!day.classList.contains('disabled')) {
            day.addEventListener('click', function() {
                selectDate(currentDate);
            });
        }
        
        grid.appendChild(day);
    }
    
    // Next month days
    for (let j = 1; j <= nextDays; j++) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = j;
        grid.appendChild(day);
    }
}

function selectDate(date) {
    appState.selectedDate = date;
    
    // Update selected styling
    document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
    event.target.classList.add('selected');
    
    // Show time slots
    displayTimeSlots(date);
}

function displayTimeSlots(date) {
    const container = document.getElementById('time-slots-container');
    const slotsEl = document.getElementById('time-slots');
    const dateInfo = document.getElementById('selected-date-info');
    
    container.style.display = 'block';
    
    // Format date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateInfo.textContent = date.toLocaleDateString('fr-FR', options);
    
    slotsEl.innerHTML = '';
    
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
    const hours = appState.businessHours[dayOfWeek];
    
    if (hours.closed) {
        slotsEl.innerHTML = '<p class="no-bookings">Le salon est fermé ce jour</p>';
        return;
    }
    
    const [openHour, openMin] = hours.open.split(':').map(Number);
    const [closeHour, closeMin] = hours.close.split(':').map(Number);
    
    let currentHour = openHour;
    let currentMin = openMin;
    
    const dateStr = formatDate(date);
    
    while (currentHour < closeHour || (currentHour === closeHour && currentMin < closeMin)) {
        const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
        
        const slot = document.createElement('div');
        slot.className = 'time-slot';
        slot.textContent = timeStr;
        
        // Check if slot is already booked
        const isBooked = appState.bookings.some(b => {
            return b.date === dateStr && b.time === timeStr;
        });
        
        if (isBooked) {
            slot.classList.add('disabled');
        } else {
            slot.addEventListener('click', function() {
                selectTimeSlot(timeStr);
            });
        }
        
        slotsEl.appendChild(slot);
        
        // Increment by 30 minutes
        currentMin += 30;
        if (currentMin >= 60) {
            currentMin = 0;
            currentHour++;
        }
    }
    
    document.querySelector('#step-2 .btn-next').disabled = true;
}

function selectTimeSlot(time) {
    appState.selectedTime = time;
    
    document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
    event.target.classList.add('selected');
    
    document.querySelector('#step-2 .btn-next').disabled = false;
}

function previousMonth() {
    appState.currentMonth--;
    if (appState.currentMonth < 0) {
        appState.currentMonth = 11;
        appState.currentYear--;
    }
    renderCalendar();
}

function nextMonth() {
    appState.currentMonth++;
    if (appState.currentMonth > 11) {
        appState.currentMonth = 0;
        appState.currentYear++;
    }
    renderCalendar();
}

function nextStep() {
    const currentStepEl = document.querySelector(`.booking-step.active`);
    currentStepEl.classList.remove('active');
    
    document.querySelector(`.step[data-step="${appState.currentStep}"]`).classList.add('completed');
    document.querySelector(`.step[data-step="${appState.currentStep}"]`).classList.remove('active');
    
    appState.currentStep++;
    
    const nextStepEl = document.querySelector(`#step-${appState.currentStep}`);
    nextStepEl.classList.add('active');
    
    document.querySelector(`.step[data-step="${appState.currentStep}"]`).classList.add('active');
    
    if (appState.currentStep === 3) {
        updateBookingSummary();
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function previousStep() {
    const currentStepEl = document.querySelector(`.booking-step.active`);
    currentStepEl.classList.remove('active');
    
    document.querySelector(`.step[data-step="${appState.currentStep}"]`).classList.remove('active');
    
    appState.currentStep--;
    
    const prevStepEl = document.querySelector(`#step-${appState.currentStep}`);
    prevStepEl.classList.add('active');
    
    document.querySelector(`.step[data-step="${appState.currentStep}"]`).classList.add('active');
    document.querySelector(`.step[data-step="${appState.currentStep}"]`).classList.remove('completed');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateBookingSummary() {
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = appState.selectedDate.toLocaleDateString('fr-FR', dateOptions);
    
    document.getElementById('summary-service').textContent = serviceNames[appState.selectedService];
    document.getElementById('summary-date').textContent = dateStr;
    document.getElementById('summary-time').textContent = appState.selectedTime;
    
    const hours = Math.floor(appState.selectedDuration / 60);
    const mins = appState.selectedDuration % 60;
    let durationStr = '';
    if (hours > 0) durationStr += `${hours}h`;
    if (mins > 0) durationStr += `${mins}min`;
    
    document.getElementById('summary-duration').textContent = durationStr;
    document.getElementById('summary-price').textContent = `${appState.selectedPrice.toLocaleString()} DA`;
}

function submitBooking() {
    const form = document.getElementById('client-form');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = new FormData(form);
    
    const booking = {
        id: generateBookingId(),
        service: appState.selectedService,
        serviceName: serviceNames[appState.selectedService],
        date: formatDate(appState.selectedDate),
        time: appState.selectedTime,
        duration: appState.selectedDuration,
        price: appState.selectedPrice,
        name: formData.get('name'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        message: formData.get('message'),
        whatsapp: formData.get('whatsapp') === 'on',
        createdAt: new Date().toISOString(),
        status: 'confirmed'
    };
    
    appState.bookings.push(booking);
    saveBookingToDatabase(booking).catch(error => {
        console.error('Erreur d’enregistrement Firestore:', error);
    });
    
    // Send confirmation (simulated)
    sendConfirmation(booking);
    
    // Show confirmation
    showConfirmation(booking);
    
    nextStep();
}

function generateBookingId() {
    return 'RDV' + Date.now().toString(36).toUpperCase();
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function sendConfirmation(booking) {
    // Simulation d'envoi d'email
    console.log('📧 Email de confirmation envoyé à:', booking.email);
    console.log('Détails:', booking);
    
    // Simulation d'envoi WhatsApp
    if (booking.whatsapp) {
        console.log('💬 Notification WhatsApp envoyée à:', booking.phone);
    }
    
    // Notification au salon
    console.log('🔔 Notification envoyée au salon');
}

function showConfirmation(booking) {
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = new Date(booking.date).toLocaleDateString('fr-FR', dateOptions);
    
    document.getElementById('confirmation-number').textContent = booking.id;
    document.getElementById('confirmation-service').textContent = booking.serviceName;
    document.getElementById('confirmation-datetime').textContent = `${dateStr} à ${booking.time}`;
}

function addToCalendar() {
    const booking = appState.bookings[appState.bookings.length - 1];
    const [year, month, day] = booking.date.split('-');
    const [hour, minute] = booking.time.split(':');
    
    const startDate = new Date(year, month - 1, day, hour, minute);
    const endDate = new Date(startDate.getTime() + booking.duration * 60000);
    
    const formatDateForCal = (date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const title = `Saby Beauté - ${booking.serviceName}`;
    const description = `Rendez-vous chez Saby Beauté\\nService: ${booking.serviceName}\\nNuméro: ${booking.id}`;
    const location = 'Saby Beauté, Centre-ville, Alger';
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatDateForCal(startDate)}/${formatDateForCal(endDate)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;
    
    window.open(url, '_blank');
}

// Admin Functions
function showAdminLogin() {
    document.getElementById('admin-modal').classList.add('active');
}

function closeAdminModal() {
    document.getElementById('admin-modal').classList.remove('active');
}

function adminLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;
    
    // Simple authentication (à remplacer par une vraie authentification)
    if (username === 'admin' && password === 'saby2024') {
        closeAdminModal();
        document.querySelector('.booking-container').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        loadAdminDashboard();
    } else {
        alert('Identifiants incorrects');
    }
    
    return false;
}

function adminLogout() {
    document.querySelector('.booking-container').style.display = 'block';
    document.getElementById('admin-dashboard').style.display = 'none';
}

function loadAdminDashboard() {
    updateAdminStats();
    renderAdminCalendar();
    renderBookingsList();
    loadSettings();
}

function updateAdminStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDate(today);
    const todayBookings = appState.bookings.filter(b => b.date === todayStr).length;
    
    // Calcul de la semaine en cours
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Lundi = début de semaine
    startOfWeek.setDate(today.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const weekBookings = appState.bookings.filter(b => {
        const bookingDate = new Date(b.date);
        return bookingDate >= startOfWeek && bookingDate <= endOfWeek;
    }).length;
    
    // Calcul du mois en cours
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    const monthBookings = appState.bookings.filter(b => {
        const bookingDate = new Date(b.date);
        return bookingDate >= startOfMonth && bookingDate <= endOfMonth;
    }).length;
    
    // Mise à jour de l'affichage
    const todayEl = document.getElementById('today-bookings');
    const weekEl = document.getElementById('week-bookings');
    const monthEl = document.getElementById('month-bookings');
    
    if (todayEl) todayEl.textContent = todayBookings;
    if (weekEl) weekEl.textContent = weekBookings;
    if (monthEl) monthEl.textContent = monthBookings;
    
    console.log('Stats mises à jour:', { 
        today: todayBookings, 
        week: weekBookings, 
        month: monthBookings,
        totalBookings: appState.bookings.length 
    });
}

function renderAdminCalendar() {
    const grid = document.getElementById('admin-calendar-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const firstDay = new Date(appState.currentYear, appState.currentMonth, 1);
    const lastDay = new Date(appState.currentYear, appState.currentMonth + 1, 0);
    const prevLastDay = new Date(appState.currentYear, appState.currentMonth, 0);
    
    const firstDayIndex = firstDay.getDay();
    const lastDayIndex = lastDay.getDay();
    const nextDays = 7 - lastDayIndex - 1;
    
    // Update month display
    const monthEl = document.getElementById('admin-current-month');
    if (monthEl) {
        const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                       'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        monthEl.textContent = `${months[appState.currentMonth]} ${appState.currentYear}`;
    }
    
    // Add day names header
    const daysHeader = document.createElement('div');
    daysHeader.className = 'calendar-days';
    daysHeader.innerHTML = `
        <div class="day-name">Dim</div>
        <div class="day-name">Lun</div>
        <div class="day-name">Mar</div>
        <div class="day-name">Mer</div>
        <div class="day-name">Jeu</div>
        <div class="day-name">Ven</div>
        <div class="day-name">Sam</div>
    `;
    grid.appendChild(daysHeader);
    
    // Create grid container
    const gridContainer = document.createElement('div');
    gridContainer.className = 'calendar-grid';
    
    // Previous month days
    for (let x = firstDayIndex; x > 0; x--) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = prevLastDay.getDate() - x + 1;
        gridContainer.appendChild(day);
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day';
        day.textContent = i;
        
        const currentDate = new Date(appState.currentYear, appState.currentMonth, i);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Check if today
        if (currentDate.toDateString() === today.toDateString()) {
            day.classList.add('today');
        }
        
        const dateStr = formatDate(currentDate);
        
        // Count bookings for this day
        const dayBookings = appState.bookings.filter(b => b.date === dateStr);
        if (dayBookings.length > 0) {
            day.classList.add('has-bookings');
            const badge = document.createElement('span');
            badge.className = 'booking-badge';
            badge.textContent = dayBookings.length;
            day.appendChild(badge);
        }
        
        // Add click handler to show day schedule
        day.addEventListener('click', function() {
            showDaySchedule(currentDate, dayBookings);
            document.querySelectorAll('#admin-calendar-grid .calendar-day').forEach(d => 
                d.classList.remove('selected')
            );
            this.classList.add('selected');
        });
        
        gridContainer.appendChild(day);
    }
    
    // Next month days
    for (let j = 1; j <= nextDays; j++) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = j;
        gridContainer.appendChild(day);
    }
    
    grid.appendChild(gridContainer);
}

function adminPreviousMonth() {
    previousMonth();
    renderAdminCalendar();
}

function adminNextMonth() {
    nextMonth();
    renderAdminCalendar();
}

function showDaySchedule(date, bookings) {
    const scheduleEl = document.getElementById('day-schedule');
    if (!scheduleEl) return;
    
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = date.toLocaleDateString('fr-FR', dateOptions);
    
    if (bookings.length === 0) {
        scheduleEl.innerHTML = `
            <h3>Rendez-vous du ${dateStr}</h3>
            <p class="no-bookings">Aucun rendez-vous pour cette date</p>
        `;
        return;
    }
    
    // Sort bookings by time
    bookings.sort((a, b) => a.time.localeCompare(b.time));
    
    scheduleEl.innerHTML = `
        <h3>Rendez-vous du ${escapeHTML(dateStr)}</h3>
        <div class="day-bookings-list">
            ${bookings.map(booking => `
                <div class="day-booking-item">
                    <div class="booking-time">${escapeHTML(booking.time)}</div>
                    <div class="booking-details">
                        <h4>${escapeHTML(booking.serviceName)}</h4>
                        <p><strong>${escapeHTML(booking.name)}</strong></p>
                        <p>📞 ${escapeHTML(booking.phone)}</p>
                        ${booking.email ? `<p>📧 ${escapeHTML(booking.email)}</p>` : ''}
                        <p class="booking-id">Réf: ${escapeHTML(booking.id)}</p>
                    </div>
                    <div class="booking-actions">
                        <button class="btn-small btn-edit" onclick="editBooking('${escapeHTML(booking.id)}')">✏️</button>
                        <button class="btn-small btn-delete" onclick="deleteBooking('${escapeHTML(booking.id)}')">🗑️</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function showAdminTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`admin-${tabName}-tab`).classList.add('active');
}

function filterBookings() {
    renderBookingsList();
}

function renderBookingsList() {
    const list = document.getElementById('bookings-list');
    const filterDate = document.getElementById('filter-date')?.value;
    const filterService = document.getElementById('filter-service')?.value;
    
    let filtered = [...appState.bookings];
    
    if (filterDate) {
        filtered = filtered.filter(b => b.date === filterDate);
    }
    
    if (filterService) {
        filtered = filtered.filter(b => b.service === filterService);
    }
    
    if (filtered.length === 0) {
        list.innerHTML = '<p class="no-bookings">Aucune réservation trouvée</p>';
        return;
    }
    
    list.innerHTML = filtered.map(booking => `
        <div class="booking-item">
            <div class="booking-info">
                <h4>${escapeHTML(booking.serviceName)}</h4>
                <p><strong>Client:</strong> ${escapeHTML(booking.name)} - ${escapeHTML(booking.phone)}</p>
                <p><strong>Date:</strong> ${escapeHTML(new Date(booking.date).toLocaleDateString('fr-FR'))} à ${escapeHTML(booking.time)}</p>
                <p><strong>Numéro:</strong> ${escapeHTML(booking.id)}</p>
            </div>
            <div class="booking-actions">
                <button class="btn-small btn-edit" onclick="editBooking('${escapeHTML(booking.id)}')">✏️ Modifier</button>
                <button class="btn-small btn-delete" onclick="deleteBooking('${escapeHTML(booking.id)}')">🗑️ Supprimer</button>
            </div>
        </div>
    `).join('');
}

function editBooking(id) {
    // Implementation for editing booking
    alert('Fonctionnalité de modification à venir');
}

function deleteBooking(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette réservation ?')) {
        appState.bookings = appState.bookings.filter(b => b.id !== id);
        deleteBookingFromDatabase(id).catch(error => {
            console.error('Erreur suppression Firestore:', error);
        });
        renderBookingsList();
        updateAdminStats();
    }
}

function exportBookings() {
    const csv = generateCSV(appState.bookings);
    downloadCSV(csv, `reservations-${formatDate(new Date())}.csv`);
}

function generateCSV(bookings) {
    const headers = ['Numéro', 'Service', 'Date', 'Heure', 'Client', 'Téléphone', 'Email', 'Statut'];
    const rows = bookings.map(b => [
        b.id,
        b.serviceName,
        b.date,
        b.time,
        b.name,
        b.phone,
        b.email || '',
        b.status
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}

function loadSettings() {
    // Load business hours into form
    const hoursForm = document.getElementById('hours-form');
    if (hoursForm) {
        Object.entries(appState.businessHours).forEach(([day, hours]) => {
            const openInput = hoursForm.querySelector(`[name="${day}-open"]`);
            const closeInput = hoursForm.querySelector(`[name="${day}-close"]`);
            const closedInput = hoursForm.querySelector(`[name="${day}-closed"]`);
            
            if (openInput) openInput.value = hours.open;
            if (closeInput) closeInput.value = hours.close;
            if (closedInput) closedInput.checked = hours.closed;
        });
        
        hoursForm.addEventListener('submit', saveBusinessHours);
    }
    
    renderClosedDays();
}

function saveBusinessHours(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    
    ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].forEach(day => {
        appState.businessHours[day] = {
            open: formData.get(`${day}-open`),
            close: formData.get(`${day}-close`),
            closed: formData.get(`${day}-closed`) === 'on'
        };
    });
    
    localStorage.setItem('businessHours', JSON.stringify(appState.businessHours));
    alert('Horaires enregistrés avec succès');
}

function renderClosedDays() {
    const list = document.getElementById('closed-days-list');
    if (!list) return;
    
    if (appState.closedDays.length === 0) {
        list.innerHTML = '<p class="no-bookings">Aucun jour de fermeture exceptionnel</p>';
        return;
    }
    
    list.innerHTML = appState.closedDays.map(day => `
        <div class="closed-day-item">
            <div>
                <strong>${escapeHTML(new Date(day.date).toLocaleDateString('fr-FR'))}</strong>
                ${day.reason ? `<p>${escapeHTML(day.reason)}</p>` : ''}
            </div>
            <button class="btn-small btn-delete" onclick="removeClosedDay('${escapeHTML(day.date)}')">🗑️</button>
        </div>
    `).join('');
}

function addClosedDay(event) {
    event.preventDefault();
    
    const date = document.getElementById('closed-day-date').value;
    const reason = document.getElementById('closed-day-reason').value;
    
    appState.closedDays.push({ date, reason });
    localStorage.setItem('closedDays', JSON.stringify(appState.closedDays));
    
    renderClosedDays();
    event.target.reset();
    
    return false;
}

function removeClosedDay(date) {
    appState.closedDays = appState.closedDays.filter(d => d.date !== date);
    localStorage.setItem('closedDays', JSON.stringify(appState.closedDays));
    renderClosedDays();
}

function showTerms() {
    alert('Conditions Générales:\n\n1. Les rendez-vous doivent être confirmés 24h à l\'avance.\n2. Toute annulation doit être effectuée au moins 24h avant le rendez-vous.\n3. En cas de retard de plus de 15 minutes, le salon se réserve le droit d\'annuler le rendez-vous.\n4. Les tarifs sont susceptibles de varier selon les prestations.');
}
