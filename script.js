(() => {
  const PRICES = {
    "Paistetut muikut perunamuussilla": 10.90,
    "Jauhelihapihvit perunamuusilla": 10.90,
    "Katariinan Erikoinen": 9.90
  };
  const modal = document.getElementById("orderModal");
  const form = document.getElementById("orderForm");
  const success = document.getElementById("orderSuccess");
  const meal = document.getElementById("meal");
  const pickupDate = document.getElementById("pickupDate");
  const pickupTime = document.getElementById("pickupTime");
  const quantity = document.getElementById("quantity");
  const total = document.getElementById("orderTotal");
  const mealDays = document.getElementById("mealDays");
  const error = document.getElementById("formError");
  const orderTitle = document.getElementById("orderTitle");
  const condimentBox = document.getElementById("condimentBox");

  const availability = {
    "Paistetut muikut perunamuussilla": [1,3,5], // ma, ke, pe
    "Jauhelihapihvit perunamuusilla": [2,4,6],   // ti, to, la
    "Katariinan Erikoinen": [1,2,3,4,5,6]       // ma-la
  };
  const dayText = {
    "Paistetut muikut perunamuussilla": "Saatavilla ma, ke ja pe.",
    "Jauhelihapihvit perunamuusilla": "Saatavilla ti, to ja la.",
    "Katariinan Erikoinen": "Saatavilla ma–la klo 9.00–18.00."
  };

  function pad(n){ return String(n).padStart(2,"0"); }
  function todayValue(){
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function ceilToFiveMinutes(date){
    const d = new Date(date);
    d.setSeconds(0, 0);
    const remainder = d.getMinutes() % 5;
    if(remainder !== 0) d.setMinutes(d.getMinutes() + (5 - remainder));
    return d;
  }
  function pickupWindow(){
    if(meal.value === "Katariinan Erikoinen") return { start: 9 * 60, end: 18 * 60 };
    return { start: 10 * 60 + 30, end: 13 * 60 };
  }
  function buildPickupTimes(){
    const previous = pickupTime.value;
    pickupTime.innerHTML = '<option value="">Valitse aika</option>';

    if(!pickupDate.value) return;

    const window = pickupWindow();
    const today = todayValue();
    let earliestMinutes = window.start;

    if(pickupDate.value === today){
      const earliest = ceilToFiveMinutes(new Date(Date.now() + 60 * 60 * 1000));
      earliestMinutes = Math.max(earliestMinutes, earliest.getHours() * 60 + earliest.getMinutes());
    }

    for(let minutes = window.start; minutes <= window.end; minutes += 5){
      if(minutes < earliestMinutes) continue;
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      const value = `${pad(h)}:${pad(m)}`;
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value.replace(":", ".");
      pickupTime.appendChild(option);
    }

    if(previous && [...pickupTime.options].some(o => o.value === previous)){
      pickupTime.value = previous;
    }
  }
  function refreshRules(){
    pickupDate.min = todayValue();
    mealDays.textContent = dayText[meal.value] || "";
    condimentBox.hidden = meal.value !== "Katariinan Erikoinen";
    buildPickupTimes();
    const price = PRICES[meal.value] || 0;
    total.textContent = (price * Math.max(1, Number(quantity.value)||1)).toFixed(2).replace(".",",") + " €";
  }
  function validatePickup(){
    error.textContent = "";
    if(!pickupDate.value || !pickupTime.value) return false;
    const chosen = new Date(`${pickupDate.value}T${pickupTime.value}`);
    if(Number.isNaN(chosen.getTime())){
      error.textContent = "Valitse kelvollinen noutoaika.";
      return false;
    }
    const [hour, minute] = pickupTime.value.split(":").map(Number);
    const minutes = hour * 60 + minute;
    const window = pickupWindow();
    if(minutes < window.start || minutes > window.end){
      error.textContent = meal.value === "Katariinan Erikoinen"
        ? "Katariinan Erikoinen on tilattavissa klo 9.00–18.00."
        : "Noutoaika on valittavissa klo 10.30–13.00.";
      return false;
    }
    if(chosen.getTime() < Date.now() + 60 * 60 * 1000){
      error.textContent = "Noutoajan tulee olla vähintään tunnin kuluttua tilauksesta.";
      return false;
    }
    const allowed = availability[meal.value] || [];
    if(!allowed.includes(chosen.getDay())){
      error.textContent = meal.value.startsWith("Paistetut")
        ? "Muikkuannos on saatavilla maanantaisin, keskiviikkoisin ja perjantaisin."
        : meal.value === "Katariinan Erikoinen"
          ? "Katariinan Erikoinen on saatavilla maanantaista lauantaihin."
          : "Pihviannos on saatavilla tiistaisin, torstaisin ja lauantaisin.";
      return false;
    }
    return true;
  }

  document.querySelectorAll(".order-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      meal.value = btn.dataset.meal;
      form.hidden = false;
      success.hidden = true;
      orderTitle.hidden = false;
      form.reset();
      meal.value = btn.dataset.meal;
      quantity.value = 1;
      refreshRules();
      modal.classList.add("open");
      modal.setAttribute("aria-hidden","false");
      document.body.classList.add("modal-open");
    });
  });

  document.querySelectorAll("[data-close-order]").forEach(el => el.addEventListener("click", () => {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden","true");
    document.body.classList.remove("modal-open");
  }));

  meal.addEventListener("change", refreshRules);
  quantity.addEventListener("input", refreshRules);
  pickupDate.addEventListener("change", () => { buildPickupTimes(); validatePickup(); });
  pickupTime.addEventListener("change", validatePickup);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if(!form.reportValidity() || !validatePickup()) return;

    error.textContent = "";
    const submitButton = form.querySelector('.submit-order[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Lähetetään...";

    const data = Object.fromEntries(new FormData(form).entries());
    const mealKey = data.meal === "Paistetut muikut perunamuussilla" ? "muikut" :
                    data.meal === "Jauhelihapihvit perunamuusilla" ? "pihvit" :
                    data.meal === "Katariinan Erikoinen" ? "erikoinen" : "";
    const condiments = [...form.querySelectorAll('input[name="condiments"]:checked')].map(el => el.value);

    const order = {
      meal: mealKey,
      quantity: Number(data.quantity),
      pickup_time: `${data.pickupDate}T${data.pickupTime}`,
      customer_name: data.customerName,
      phone: data.phone,
      email: data.email,
      address: data.address,
      condiments: mealKey === "erikoinen" ? condiments : []
    };

    try {
      const response = await fetch("https://katariinan-tupa-orders.cubergames.workers.dev/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order)
      });

      let result = {};
      try { result = await response.json(); } catch (_) {}

      if (!response.ok) {
        throw new Error(result.error || "Tilauksen lähetys epäonnistui. Yritä uudelleen.");
      }

      localStorage.setItem("katariinanTupaLatestOrder", JSON.stringify({
        ...order,
        orderId: result.orderId || "",
        createdAt: new Date().toISOString()
      }));

      form.hidden = true;
      orderTitle.hidden = true;
      success.hidden = false;
    } catch (err) {
      error.textContent = err && err.message ? err.message : "Tilauksen lähetys epäonnistui. Yritä uudelleen.";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  });


  refreshRules();
  setInterval(() => { if(modal.classList.contains("open")) buildPickupTimes(); }, 30000);
})();