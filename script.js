(() => {
  const PRICE = 10.90;
  const modal = document.getElementById("orderModal");
  const form = document.getElementById("orderForm");
  const success = document.getElementById("orderSuccess");
  const meal = document.getElementById("meal");
  const pickup = document.getElementById("pickup");
  const quantity = document.getElementById("quantity");
  const total = document.getElementById("orderTotal");
  const mealDays = document.getElementById("mealDays");
  const error = document.getElementById("formError");

  const availability = {
    "Paistetut muikut perunamuussilla": [1,3,5], // ma, ke, pe
    "Jauhelihapihvit perunamuusilla": [2,4,6]    // ti, to, la
  };
  const dayText = {
    "Paistetut muikut perunamuussilla": "Saatavilla ma, ke ja pe.",
    "Jauhelihapihvit perunamuusilla": "Saatavilla ti, to ja la."
  };

  function pad(n){ return String(n).padStart(2,"0"); }
  function localValue(d){
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function minimumPickup(){
    const exactMinimum = new Date(Date.now() + 60 * 60 * 1000);
    exactMinimum.setSeconds(0, 0);

    // Pyöristetään ylöspäin seuraavaan 5 minuuttiin.
    // Näin valittava aika ei voi koskaan olla alle tuntia nykyhetkestä.
    const minutes = exactMinimum.getMinutes();
    const remainder = minutes % 5;
    if (remainder !== 0) {
      exactMinimum.setMinutes(minutes + (5 - remainder));
    }
    return exactMinimum;
  }
  function refreshRules(){
    pickup.min = localValue(minimumPickup());
    mealDays.textContent = dayText[meal.value] || "";
    total.textContent = (PRICE * Math.max(1, Number(quantity.value)||1)).toFixed(2).replace(".",",") + " €";
  }
  function validatePickup(){
    error.textContent = "";
    if(!pickup.value) return false;
    const chosen = new Date(pickup.value);
    if(chosen < minimumPickup()){
      error.textContent = "Valitse noutoaika vähintään tunnin päähän.";
      return false;
    }
    const allowed = availability[meal.value] || [];
    if(!allowed.includes(chosen.getDay())){
      error.textContent = meal.value.startsWith("Paistetut") ?
        "Muikkuannos on saatavilla maanantaisin, keskiviikkoisin ja perjantaisin." :
        "Pihviannos on saatavilla tiistaisin, torstaisin ja lauantaisin.";
      return false;
    }
    return true;
  }

  document.querySelectorAll(".order-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      meal.value = btn.dataset.meal;
      form.hidden = false;
      success.hidden = true;
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
  pickup.addEventListener("change", validatePickup);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if(!form.reportValidity() || !validatePickup()) return;

    // V16 contains the complete browser-side ordering UI and validation.
    // The email approval workflow is connected to a server/API in the next step.
    const order = Object.fromEntries(new FormData(form).entries());
    order.total = (PRICE * Number(order.quantity)).toFixed(2);
    order.createdAt = new Date().toISOString();
    localStorage.setItem("katariinanTupaLatestOrder", JSON.stringify(order));

    form.hidden = true;
    success.hidden = false;
  });


  setInterval(() => {
    if (modal.classList.contains("open")) {
      pickup.min = localValue(minimumPickup());
      if (pickup.value && new Date(pickup.value) < minimumPickup()) {
        pickup.value = "";
      }
    }
  }, 30000);

  refreshRules();
})();